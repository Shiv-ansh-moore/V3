import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

// This runs as a separate process, not inside the app. It reads the saved app
// selection from the App Group and re-applies the shields at the relock time.

class DeviceActivityMonitorExtension: DeviceActivityMonitor {
    
    let store = ManagedSettingsStore()
    let sharedDefaults = UserDefaults(suiteName: "group.com.anonymous.V3App.shared")
    let unlockActivityName = "V3Unlock"

    private enum DefaultsKey {
        static let blockedSelection = "blockedSelection"
        static let unlockEndTime = "unlockEndTime"
        static let unlockStartTime = "unlockStartTime"
        static let unlockTotalDuration = "unlockTotalDuration"
        static let unlockReason = "unlockReason"
    }

    private func savedSelection() -> FamilyActivitySelection? {
        guard let data = sharedDefaults?.data(forKey: DefaultsKey.blockedSelection),
              let selection = try? JSONDecoder().decode(
                FamilyActivitySelection.self,
                from: data
              )
        else {
            return nil
        }

        return selection
    }

    private func unlockHasExpired(now: Date = Date()) -> Bool {
        let endTime = sharedDefaults?.double(forKey: DefaultsKey.unlockEndTime) ?? 0
        return endTime > 0 && endTime <= now.timeIntervalSince1970
    }

    private func applySavedShields() -> Bool {
        guard let selection = savedSelection() else { return false }

        let appTokens = selection.applicationTokens
        let categoryTokens = selection.categoryTokens

        store.shield.applications = appTokens.isEmpty ? nil : appTokens
        store.shield.applicationCategories = categoryTokens.isEmpty
            ? nil : .specific(categoryTokens)

        return true
    }

    private func clearUnlockMetadata() {
        sharedDefaults?.removeObject(forKey: DefaultsKey.unlockEndTime)
        sharedDefaults?.removeObject(forKey: DefaultsKey.unlockStartTime)
        sharedDefaults?.removeObject(forKey: DefaultsKey.unlockTotalDuration)
        sharedDefaults?.removeObject(forKey: DefaultsKey.unlockReason)
    }

    private func relockIfUnlockExpired() {
        guard unlockHasExpired() else { return }
        guard applySavedShields() else { return }

        clearUnlockMetadata()
    }

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)

        guard activity.rawValue == unlockActivityName else { return }

        // The app schedules this interval to start at relockAt and last at least
        // 15 minutes because short DeviceActivity intervals are unreliable.
        // Starting the interval is the relock trigger for 2, 5, 15, and 30 min unlocks.
        relockIfUnlockExpired()
    }
    
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        
        guard activity.rawValue == unlockActivityName else { return }

        // Compatibility fallback for old now-to-end schedules and delayed
        // callbacks. Stale callbacks from replaced schedules no-op while a newer
        // unlockEndTime is still in the future.
        relockIfUnlockExpired()
    }
}
