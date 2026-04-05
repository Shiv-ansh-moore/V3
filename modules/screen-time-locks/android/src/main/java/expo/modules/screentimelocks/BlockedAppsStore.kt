package expo.modules.screentimelocks

import android.content.Context

object BlockedAppsStore {
    private const val PREFS_NAME = "v3_blocked_apps"
    private const val KEY_BLOCKED_SET = "blocked_set"

    private fun getPrefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

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
}
