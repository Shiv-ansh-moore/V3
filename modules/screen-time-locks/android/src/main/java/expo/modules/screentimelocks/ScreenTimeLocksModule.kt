package expo.modules.screentimelocks

import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ScreenTimeLocksModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ScreenTimeLocks")

    AsyncFunction("requestAuthorization") {
      return@AsyncFunction "not_supported"
    }

    AsyncFunction("showAppPicker") {
      return@AsyncFunction mapOf("selectedApps" to 0)
    }

    // ===== Blocking =====

    AsyncFunction("blockApps") { packageNames: List<String> ->
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("blocked" to 0)
      BlockedAppsStore.setBlockedApps(context, packageNames.toSet())
      Log.d("V3Blocker", "Blocked ${packageNames.size} apps: $packageNames")
      mapOf("blocked" to packageNames.size)
    }

    AsyncFunction("addBlockedApp") { packageName: String ->
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("success" to false)
      BlockedAppsStore.addBlockedApp(context, packageName)
      Log.d("V3Blocker", "Added blocked app: $packageName")
      mapOf("success" to true)
    }

    AsyncFunction("removeBlockedApp") { packageName: String ->
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("success" to false)
      BlockedAppsStore.removeBlockedApp(context, packageName)
      Log.d("V3Blocker", "Removed blocked app: $packageName")
      mapOf("success" to true)
    }

    AsyncFunction("getBlockedApps") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<String>()
      BlockedAppsStore.getBlockedApps(context).toList()
    }

    AsyncFunction("unblockApps") {
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("success" to false)
      BlockedAppsStore.setBlockedApps(context, emptySet())
      Log.d("V3Blocker", "Cleared all blocked apps")
      mapOf("success" to true)
    }

    AsyncFunction("manageBlockedApps") {
      return@AsyncFunction mapOf("cancelled" to true)
    }

    // ===== Unlock Timing =====

    AsyncFunction("unlockForDuration") { minutes: Int, reason: String ->
      val context = appContext.reactContext ?: return@AsyncFunction mapOf(
        "success" to false,
        "error" to "no_context"
      )

      val startTime = System.currentTimeMillis()
      val endTime = startTime + (minutes * 60 * 1000L)
      val totalDuration = minutes * 60L  // seconds, matching iOS

      BlockedAppsStore.setUnlockData(
        context,
        endTime,
        startTime,
        totalDuration,
        reason
      )

      Log.d("V3Blocker", "Unlocked for $minutes minutes: $reason")

      mapOf(
        "success" to true,
        "endTime" to endTime / 1000,
        "startTime" to startTime / 1000,
        "totalDuration" to totalDuration,
        "reason" to reason
      )
    }

    AsyncFunction("relockNow") {
      val context = appContext.reactContext ?: return@AsyncFunction mapOf(
        "success" to false,
        "error" to "no_context"
      )

      BlockedAppsStore.clearUnlockData(context)
      Log.d("V3Blocker", "Manually relocked")

      mapOf("success" to true)
    }

    Function("getActiveUnlock") {
      val context = appContext.reactContext ?: return@Function null
      val data = BlockedAppsStore.getUnlockData(context)
      Log.d("V3Blocker", "getActiveUnlock: $data")
      data
    }
  }
}
