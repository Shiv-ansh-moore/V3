import ExpoModulesCore
import FamilyControls

public class ScreenTimeLocksModule: Module {
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
                            let count = selection.applicationTokens.count
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
                }
                else {
          promise.reject("ERR", "Requires iOS 16+")
        }
            }
        }
    }
}
