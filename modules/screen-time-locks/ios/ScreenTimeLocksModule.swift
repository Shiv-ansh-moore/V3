import ExpoModulesCore
import FamilyControls
import ManagedSettings
import DeviceActivity
// categorys show up in consol log as apps

public class ScreenTimeLocksModule: Module {
  private var currentSelection: FamilyActivitySelection?
  private let store = ManagedSettingsStore()
  private let sharedDefaults = UserDefaults(suiteName: "group.com.anonymous.V3App.shared")
  private let unlockActivityName = DeviceActivityName("V3Unlock")
  private let relockMonitorMinimumMinutes = 15

  private enum DefaultsKey {
    static let blockedSelection = "blockedSelection"
    static let unlockEndTime = "unlockEndTime"
    static let unlockStartTime = "unlockStartTime"
    static let unlockTotalDuration = "unlockTotalDuration"
    static let unlockReason = "unlockReason"
  }

  private func savedSelection() -> FamilyActivitySelection? {
    if let selection = self.currentSelection {
      return selection
    }

    guard let data = self.sharedDefaults?.data(forKey: DefaultsKey.blockedSelection),
          let saved = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    else {
      return nil
    }

    return saved
  }

  private func saveSelection(_ selection: FamilyActivitySelection) {
    if let data = try? JSONEncoder().encode(selection) {
      self.sharedDefaults?.set(data, forKey: DefaultsKey.blockedSelection)
    }
  }

  private func saveUnlockMetadata(
    startDate: Date,
    endDate: Date,
    minutes: Int,
    reason: String
  ) {
    self.sharedDefaults?.set(endDate.timeIntervalSince1970, forKey: DefaultsKey.unlockEndTime)
    self.sharedDefaults?.set(startDate.timeIntervalSince1970, forKey: DefaultsKey.unlockStartTime)
    self.sharedDefaults?.set(minutes * 60, forKey: DefaultsKey.unlockTotalDuration)
    self.sharedDefaults?.set(reason, forKey: DefaultsKey.unlockReason)
  }

  private func clearUnlockMetadata() {
    self.sharedDefaults?.removeObject(forKey: DefaultsKey.unlockEndTime)
    self.sharedDefaults?.removeObject(forKey: DefaultsKey.unlockStartTime)
    self.sharedDefaults?.removeObject(forKey: DefaultsKey.unlockTotalDuration)
    self.sharedDefaults?.removeObject(forKey: DefaultsKey.unlockReason)
  }

  @available(iOS 16.0, *)
  private func applyShields(for selection: FamilyActivitySelection) {
    let appTokens = selection.applicationTokens
    let categoryTokens = selection.categoryTokens
    self.store.shield.applications = appTokens.isEmpty ? nil : appTokens
    self.store.shield.applicationCategories = categoryTokens.isEmpty ? nil : .specific(categoryTokens)
  }

  @available(iOS 16.0, *)
  private func clearShields() {
    self.store.shield.applications = nil
    self.store.shield.applicationCategories = nil
  }

  private func deviceActivityComponents(for date: Date, calendar: Calendar) -> DateComponents {
    var components = calendar.dateComponents(
      [.era, .year, .month, .day, .hour, .minute, .second],
      from: date
    )
    components.calendar = calendar
    components.timeZone = calendar.timeZone
    return components
  }

  @available(iOS 16.0, *)
  private func startRelockMonitor(relockAt: Date) throws {
    let calendar = Calendar.current
    let monitorEnd = relockAt.addingTimeInterval(
      TimeInterval(self.relockMonitorMinimumMinutes * 60)
    )

    // DeviceActivity intervals shorter than about 15 minutes are unreliable.
    // Unlock immediately, then run a 15-minute monitor window that starts at
    // the desired relock time; the extension re-applies shields in intervalDidStart.
    let schedule = DeviceActivitySchedule(
      intervalStart: self.deviceActivityComponents(for: relockAt, calendar: calendar),
      intervalEnd: self.deviceActivityComponents(for: monitorEnd, calendar: calendar),
      repeats: false
    )

    try DeviceActivityCenter().startMonitoring(
      self.unlockActivityName,
      during: schedule
    )
  }


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
        self.applyShields(for: selection)

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
        guard minutes > 0 else {
          throw NSError(
            domain: "ScreenTimeLocks",
            code: 3,
            userInfo: [NSLocalizedDescriptionKey: "Unlock duration must be positive."]
          )
        }

        guard let selection = self.savedSelection() else {
          throw NSError(
            domain: "ScreenTimeLocks",
            code: 2,
            userInfo: [NSLocalizedDescriptionKey: "No apps selected. Open the picker first."]
          )
        }

        // 1. Save selection so DeviceMonitor can re-lock later
        self.saveSelection(selection)

        // 2. Save unlock timing + reason for UI countdown persistence
        let now = Date()
        let endDate = now.addingTimeInterval(TimeInterval(minutes * 60))
        self.saveUnlockMetadata(
          startDate: now,
          endDate: endDate,
          minutes: minutes,
          reason: reason
        )

        do {
          try self.startRelockMonitor(relockAt: endDate)
        } catch {
          self.applyShields(for: selection)
          self.clearUnlockMetadata()
          throw error
        }

        // 3. Remove shields (unlock) after the future relock monitor is in place.
        self.clearShields()
        
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
        if let selection = self.savedSelection() {
          self.applyShields(for: selection)
        }
        
        let center = DeviceActivityCenter()
        center.stopMonitoring([self.unlockActivityName])
        self.clearUnlockMetadata()

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
          if let data = self.sharedDefaults?.data(forKey: DefaultsKey.blockedSelection),
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
              self.saveSelection(selection)

              // Apply shields immediately
              let appTokens = selection.applicationTokens
              let categoryTokens = selection.categoryTokens
              self.applyShields(for: selection)

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
      let endTime = self.sharedDefaults?.double(forKey: DefaultsKey.unlockEndTime) ?? 0
      guard endTime > 0, endTime > Date().timeIntervalSince1970 else {
        return nil
      }
      let startTime = self.sharedDefaults?.double(forKey: DefaultsKey.unlockStartTime) ?? 0
      let totalDuration = self.sharedDefaults?.integer(forKey: DefaultsKey.unlockTotalDuration) ?? 0
      let reason = self.sharedDefaults?.string(forKey: DefaultsKey.unlockReason) ?? ""
      return [
        "endTime": endTime,
        "startTime": startTime,
        "totalDuration": totalDuration,
        "reason": reason
      ]
    }

  }
}
