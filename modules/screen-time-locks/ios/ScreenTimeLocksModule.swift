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
     AsyncFunction("unlockForDuration") { (minutes: Int) -> String in
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
        
        // 2. Save when the unlock ends (for UI countdown)
        let endDate = Date().addingTimeInterval(TimeInterval(minutes * 60))
        self.sharedDefaults?.set(endDate.timeIntervalSince1970, forKey: "unlockEndTime")
        
        // 3. Remove shields (unlock)
        self.store.shield.applications = nil
        self.store.shield.applicationCategories = nil
        
        // 4. Schedule DeviceActivity — fires intervalDidEnd when time's up
        let now = Date()
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
  }
}