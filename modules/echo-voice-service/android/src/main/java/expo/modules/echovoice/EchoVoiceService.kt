package expo.modules.echovoice

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager

// Keeps a user-started speech session eligible for background microphone access.
// Recognition is owned by expo-speech-recognition; this service never saves audio.
class EchoVoiceService : Service() {
  companion object {
    var onReady: ((Exception?) -> Unit)? = null
    var onStopped: (() -> Unit)? = null
    private const val CHANNEL = "echo-hands-free"
    private const val NOTIFICATION = 7041
  }
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == "STOP") {
      onStopped?.invoke()
      onStopped = null
      stopSelf()
      return START_NOT_STICKY
    }
    try {
      val manager = getSystemService(NotificationManager::class.java)
      manager.createNotificationChannel(NotificationChannel(CHANNEL, "Hands-free voice", NotificationManager.IMPORTANCE_LOW))
      val stop = PendingIntent.getService(this, 1,
        Intent(this, EchoVoiceService::class.java).setAction("STOP"),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      val open = packageManager.getLaunchIntentForPackage(packageName)?.let {
        PendingIntent.getActivity(this, 2, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      }
      val notification = Notification.Builder(this, CHANNEL)
        .setSmallIcon(android.R.drawable.ic_btn_speak_now)
        .setContentTitle("Echo hands-free is on")
        .setContentText("Microphone active. Say Hey Echo, then a command.")
        .setContentIntent(open)
        .setOngoing(true)
        .addAction(Notification.Action.Builder(null, "Turn microphone off", stop).build())
        .build()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(NOTIFICATION, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
      } else {
        startForeground(NOTIFICATION, notification)
      }
      if (wakeLock == null) {
        wakeLock = (getSystemService(Context.POWER_SERVICE) as PowerManager)
          .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Echo:VoiceSession").apply { acquire() }
      }
      onReady?.invoke(null)
      onReady = null
    } catch (error: Exception) {
      onReady?.invoke(error)
      onReady = null
      stopSelf()
    }
    // Never relaunch the microphone after force-stop, process death, or reboot.
    return START_NOT_STICKY
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    onStopped?.invoke()
    onStopped = null
    stopSelf()
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    stopForeground(STOP_FOREGROUND_REMOVE)
    onStopped?.invoke()
    onStopped = null
    super.onDestroy()
  }
}
