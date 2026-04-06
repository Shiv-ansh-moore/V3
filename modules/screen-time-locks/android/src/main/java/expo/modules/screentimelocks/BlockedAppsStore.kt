package expo.modules.screentimelocks

import android.content.Context

object BlockedAppsStore {
    private const val PREFS_NAME = "v3_blocked_apps"
    private const val KEY_BLOCKED_SET = "blocked_set"

    // Unlock timing keys (matching iOS)
    private const val KEY_UNLOCK_END_TIME = "unlock_end_time"
    private const val KEY_UNLOCK_START_TIME = "unlock_start_time"
    private const val KEY_UNLOCK_TOTAL_DURATION = "unlock_total_duration"
    private const val KEY_UNLOCK_REASON = "unlock_reason"

    private fun getPrefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_MULTI_PROCESS)

    fun getBlockedApps(context: Context): Set<String> {
        return getPrefs(context).getStringSet(KEY_BLOCKED_SET, emptySet()) ?: emptySet()
    }

    fun setBlockedApps(context: Context, packages: Set<String>) {
        getPrefs(context).edit().putStringSet(KEY_BLOCKED_SET, packages).commit()
    }

    fun addBlockedApp(context: Context, packageName: String) {
        val current = getBlockedApps(context).toMutableSet()
        current.add(packageName)
        setBlockedApps(context, current)
    }

    fun removeBlockedApp(context: Context, packageName: String) {
        val current = getBlockedApps(context).toMutableSet()
        current.remove(packageName)
        setBlockedApps(context, current)
    }

    // ===== Unlock Timing =====

    fun setUnlockData(
        context: Context,
        endTime: Long,
        startTime: Long,
        totalDuration: Long,
        reason: String
    ) {
        getPrefs(context).edit()
            .putLong(KEY_UNLOCK_END_TIME, endTime)
            .putLong(KEY_UNLOCK_START_TIME, startTime)
            .putLong(KEY_UNLOCK_TOTAL_DURATION, totalDuration)
            .putString(KEY_UNLOCK_REASON, reason)
            .commit()
    }

    fun getUnlockData(context: Context): Map<String, Any>? {
        val prefs = getPrefs(context)
        val endTime = prefs.getLong(KEY_UNLOCK_END_TIME, 0)

        if (endTime == 0L) return null

        if (System.currentTimeMillis() > endTime) {
            clearUnlockData(context)
            return null
        }

        // Convert ms → seconds to match iOS (React Native expects seconds)
        return mapOf(
            "endTime" to endTime / 1000,
            "startTime" to prefs.getLong(KEY_UNLOCK_START_TIME, 0) / 1000,
            "totalDuration" to prefs.getLong(KEY_UNLOCK_TOTAL_DURATION, 0),
            "reason" to (prefs.getString(KEY_UNLOCK_REASON, "") ?: "")
        )
    }

    fun clearUnlockData(context: Context) {
        getPrefs(context).edit()
            .remove(KEY_UNLOCK_END_TIME)
            .remove(KEY_UNLOCK_START_TIME)
            .remove(KEY_UNLOCK_TOTAL_DURATION)
            .remove(KEY_UNLOCK_REASON)
            .commit()
    }

    fun isUnlocked(context: Context): Boolean {
        val endTime = getPrefs(context).getLong(KEY_UNLOCK_END_TIME, 0)
        return endTime > 0 && System.currentTimeMillis() < endTime
    }
}
