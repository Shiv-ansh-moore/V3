import ExpoModulesCore
import FamilyControls
import ManagedSettings
import DeviceActivity
// categorys show up in consol log as apps

public class ScreenTimeLocksModule: Module {
  private var currentSelection: FamilyActivitySelection?
  private let store = ManagedSettingsStore()
  private let sharedDefaults = UserDefaults(suiteName: "group.com.anonymous.V3App.shared")


  public func definition() -> ModuleDefinition {
    Name("ScreenTimeLocks")

    AsyncFunction("requestAuthorization") {
      if #available(iOS 16.0, *) {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        return "authorized"
      } else {
        throw NSError(
          domain: "ScreenTimeLocks",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Requires iOS 16+"]
        )
      }
    }

    AsyncFunction("showAppPicker") { (promise: Promise) in
      DispatchQueue.main.async {
        guard let rootVC = UIApplication.shared.connectedScenes
          .compactMap({ $0 as? UIWindowScene })
          .first?.windows.first?.rootViewController
        else {
          promise.reject("ERR", "No root view controller")
          return
        }

        if #available(iOS 16.0, *) {
          let picker = AppPickerViewController()
          picker.modalPresentationStyle = .pageSheet
          var observers: [Any] = []

          let doneObserver = NotificationCenter.default.addObserver(
            forName: .appSelectionComplete,
            object: nil,
            queue: .main
          ) { notification in
            if let selection = notification.object as? FamilyActivitySelection {
              self.currentSelection = selection
              let count = selection.applicationTokens.count + selection.categoryTokens.count
              promise.resolve(["selectedApps": count])
            }
            observers.forEach { NotificationCenter.default.removeObserver($0) }
            rootVC.dismiss(animated: true)
          }
          observers.append(doneObserver)

          let cancelObserver = NotificationCenter.default.addObserver(
            forName: .appSelectionCancelled,
            object: nil,
            queue: .main
          ) { _ in
            promise.reject("CANCELLED", "User cancelled")
            observers.forEach { NotificationCenter.default.removeObserver($0) }
            rootVC.dismiss(animated: true)
          }
          observers.append(cancelObserver)

          rootVC.present(picker, animated: true)
        } else {
          promise.reject("ERR", "Requires iOS 16+")
        }
      }
    }

    AsyncFunction("blockApps") {
      if #available(iOS 16.0, *) {
        guard let selection = self.currentSelection else {
          throw NSError(
            domain: "ScreenTimeLocks",
            code: 2,
            userInfo: [NSLocalizedDescriptionKey: "No apps selected. Open the picker first."]
          )
        }

        let appTokens = selection.applicationTokens
        let categoryTokens = selection.categoryTokens
        self.store.shield.applications = appTokens
        self.store.shield.applicationCategories = .specific(categoryTokens)

        return ["blocked": appTokens.count + categoryTokens.count]
      } else {
        throw NSError(
          domain: "ScreenTimeLocks",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Requires iOS 16+"]
        )
      }
    }

    AsyncFunction("unblockApps") {
      if #available(iOS 16.0, *) {
        self.store.shield.applications = nil
        self.store.shield.applicationCategories = nil
        return "unblocked"
      } else {
        throw NSError(
          domain: "ScreenTimeLocks",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Requires iOS 16+"]
        )
      }
    }
     AsyncFunction("unlockForDuration") { (minutes: Int, reason: String) -> String in
      if #available(iOS 16.0, *) {
        guard let selection = self.currentSelection else {
          throw NSError(
            domain: "ScreenTimeLocks",
            code: 2,
            userInfo: [NSLocalizedDescriptionKey: "No apps selected. Open the picker first."]
          )
        }

        // 1. Save selection so DeviceMonitor can re-lock later
        if let data = try? JSONEncoder().encode(selection) {
          self.sharedDefaults?.set(data, forKey: "blockedSelection")
        }

        // 2. Save unlock timing + reason for UI countdown persistence
        let now = Date()
        let endDate = now.addingTimeInterval(TimeInterval(minutes * 60))
        self.sharedDefaults?.set(endDate.timeIntervalSince1970, forKey: "unlockEndTime")
        self.sharedDefaults?.set(now.timeIntervalSince1970, forKey: "unlockStartTime")
        self.sharedDefaults?.set(minutes * 60, forKey: "unlockTotalDuration")
        self.sharedDefaults?.set(reason, forKey: "unlockReason")
        
        // 3. Remove shields (unlock)
        self.store.shield.applications = nil
        self.store.shield.applicationCategories = nil
        
        // 4. Schedule DeviceActivity — fires intervalDidEnd when time's up
        let calendar = Calendar.current
        
        let start = calendar.dateComponents(
          [.hour, .minute, .second],
          from: now
        )
        let end = calendar.dateComponents(
          [.hour, .minute, .second],
          from: endDate
        )
        
        let schedule = DeviceActivitySchedule(
          intervalStart: start,
          intervalEnd: end,
          repeats: false
        )
        
        let center = DeviceActivityCenter()
        try center.startMonitoring(
          DeviceActivityName("V3Unlock"),
          during: schedule
        )
        
        return "unlocked for \(minutes) minutes"
      } else {throw NSError(
          domain: "ScreenTimeLocks",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Requires iOS 16+"]
        )
      }
    }
        AsyncFunction("relockNow") {
      if #available(iOS 16.0, *) {
        if let data = self.sharedDefaults?.data(forKey: "blockedSelection"),
           let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
          let appTokens = selection.applicationTokens
          let categoryTokens = selection.categoryTokens
          self.store.shield.applications = appTokens.isEmpty ? nil : appTokens
          self.store.shield.applicationCategories = categoryTokens.isEmpty ? nil : .specific(categoryTokens)
        } else if let selection = self.currentSelection {
          self.store.shield.applications = selection.applicationTokens
          self.store.shield.applicationCategories = .specific(selection.categoryTokens)
        }
        
        let center = DeviceActivityCenter()
        center.stopMonitoring([DeviceActivityName("V3Unlock")])
        self.sharedDefaults?.removeObject(forKey: "unlockEndTime")
        self.sharedDefaults?.removeObject(forKey: "unlockStartTime")
        self.sharedDefaults?.removeObject(forKey: "unlockTotalDuration")
        self.sharedDefaults?.removeObject(forKey: "unlockReason")

        return "relocked"
      } else {
        throw NSError(
          domain: "ScreenTimeLocks",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Requires iOS 16+"]
        )
      }
    }

    AsyncFunction("manageBlockedApps") { (promise: Promise) in
      DispatchQueue.main.async {
        guard let rootVC = UIApplication.shared.connectedScenes
          .compactMap({ $0 as? UIWindowScene })
          .first?.windows.first?.rootViewController
        else {
          promise.reject("ERR", "No root view controller")
          return
        }

        if #available(iOS 16.0, *) {
          // Load saved selection (if any) from UserDefaults
          var initialSelection = FamilyActivitySelection()
          if let data = self.sharedDefaults?.data(forKey: "blockedSelection"),
             let saved = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
            initialSelection = saved
          }

          // Create picker pre-populated with saved selection
          let picker = AppPickerViewController(initialSelection: initialSelection)
          picker.modalPresentationStyle = .pageSheet
          var observers: [Any] = []

          let doneObserver = NotificationCenter.default.addObserver(
            forName: .appSelectionComplete,
            object: nil,
            queue: .main
          ) { notification in
            if let selection = notification.object as? FamilyActivitySelection {
              // Update in-memory selection
              self.currentSelection = selection

              // Save to UserDefaults
              if let data = try? JSONEncoder().encode(selection) {
                self.sharedDefaults?.set(data, forKey: "blockedSelection")
              }

              // Apply shields immediately
              let appTokens = selection.applicationTokens
              let categoryTokens = selection.categoryTokens
              self.store.shield.applications = appTokens.isEmpty ? nil : appTokens
              self.store.shield.applicationCategories = categoryTokens.isEmpty ? nil : .specific(categoryTokens)

              let count = appTokens.count + categoryTokens.count
              promise.resolve(["blocked": count])
            }
            observers.forEach { NotificationCenter.default.removeObserver($0) }
            rootVC.dismiss(animated: true)
          }
          observers.append(doneObserver)

          let cancelObserver = NotificationCenter.default.addObserver(
            forName: .appSelectionCancelled,
            object: nil,
            queue: .main
          ) { _ in
            promise.resolve(["cancelled": true])
            observers.forEach { NotificationCenter.default.removeObserver($0) }
            rootVC.dismiss(animated: true)
          }
          observers.append(cancelObserver)

          rootVC.present(picker, animated: true)
        } else {
          promise.reject("ERR", "Requires iOS 16+")
        }
      }
    }

    Function("getActiveUnlock") { () -> [String: Any]? in
      let endTime = self.sharedDefaults?.double(forKey: "unlockEndTime") ?? 0
      guard endTime > 0, endTime > Date().timeIntervalSince1970 else {
        return nil
      }
      let startTime = self.sharedDefaults?.double(forKey: "unlockStartTime") ?? 0
      let totalDuration = self.sharedDefaults?.integer(forKey: "unlockTotalDuration") ?? 0
      let reason = self.sharedDefaults?.string(forKey: "unlockReason") ?? ""
      return [
        "endTime": endTime,
        "startTime": startTime,
        "totalDuration": totalDuration,
        "reason": reason
      ]
    }

  }
}