package expo.modules.screentimelocks

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

class WarningActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_warning)

        // "Open V3" button — go home, user can tap V3 from there
        findViewById<Button>(R.id.btnOpenV3).setOnClickListener {
            goHome()
        }

        // "Close" button — just go home
        findViewById<Button>(R.id.btnClose).setOnClickListener {
            goHome()
        }
    }

    private fun goHome() {
        val intent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(intent)
        finishAffinity()  // Closes this activity completely
    }

    // Back button also goes home (can't go back to blocked app)
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        goHome()
    }
}
