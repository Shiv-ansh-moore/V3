package expo.modules.screentimelocks

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent

class AppBlockerService : AccessibilityService() {

    private var lastPackage = ""
    private val handler = Handler(Looper.getMainLooper())

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val packageName = event.packageName?.toString() ?: return

        if (packageName == lastPackage) return
        if (packageName == "com.android.systemui") return
        if (packageName == applicationContext.packageName) return

        lastPackage = packageName

        Log.d("V3Blocker", "App opened: $packageName")

        val blockedApps = BlockedAppsStore.getBlockedApps(applicationContext)
        if (packageName in blockedApps) {
            if (BlockedAppsStore.isUnlocked(applicationContext)) {
                Log.d("V3Blocker", "Unlock active, skipping block for $packageName")
                return
            }
            Log.d("V3Blocker", "BLOCKED: $packageName")
            performGlobalAction(GLOBAL_ACTION_HOME)
            lastPackage = ""
            handler.postDelayed({
                val intent = Intent(this, WarningActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    putExtra("packageName", packageName)
                }
                startActivity(intent)
            }, 300)
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d("V3Blocker", "Accessibility Service connected!")
    }

    override fun onInterrupt() {
        Log.d("V3Blocker", "Accessibility Service interrupted")
    }
}
