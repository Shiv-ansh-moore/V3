import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

// This runs as a SEPARATE PROCESS — not inside your app.
// iOS wakes it up when the scheduled activity ends.
// It reads the saved app selection from the App Group
// and re-applies the shields.

class DeviceActivityMonitorExtension: DeviceActivityMonitor {
    
    let store = ManagedSettingsStore()
    let sharedDefaults = UserDefaults(suiteName: "group.com.anonymous.V3App.shared")
    
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        
        // Only handle our unlock activity
        guard activity.rawValue == "V3Unlock" else { return }
        
        // Load the saved selection from App Group
        guard let data = sharedDefaults?.data(forKey: "blockedSelection"),
              let selection = try? JSONDecoder().decode(
                FamilyActivitySelection.self, from: data
              ) else { return }
        
        // Re-apply shields (re-lock)
        let appTokens = selection.applicationTokens
        let categoryTokens = selection.categoryTokens
        
        store.shield.applications = appTokens.isEmpty ? nil : appTokens
        store.shield.applicationCategories = categoryTokens.isEmpty
            ? nil : .specific(categoryTokens)
        
        // Clean up
        sharedDefaults?.removeObject(forKey: "unlockEndTime")
    }
}
