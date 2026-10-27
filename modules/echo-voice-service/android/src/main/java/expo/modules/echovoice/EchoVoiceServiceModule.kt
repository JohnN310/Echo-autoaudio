package expo.modules.echovoice

import android.content.Intent
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class EchoVoiceServiceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("EchoVoiceService")
    Events("stopped")

    AsyncFunction("start") { promise: Promise ->
      val context = appContext.reactContext
      if (context == null || appContext.currentActivity == null) {
        promise.reject("NO_ACTIVITY", "Open Echo before enabling hands-free.", null)
      } else {
        val handler = Handler(Looper.getMainLooper())
        val timeout = Runnable {
          val ready = EchoVoiceService.onReady
          EchoVoiceService.onReady = null
          ready?.invoke(Exception("Microphone service did not start. Please retry."))
          context.stopService(Intent(context, EchoVoiceService::class.java))
        }
        EchoVoiceService.onReady = { error ->
          handler.removeCallbacks(timeout)
          if (error == null) promise.resolve(null)
          else promise.reject("VOICE_SERVICE", error.message, error)
        }
        EchoVoiceService.onStopped = { sendEvent("stopped", emptyMap<String, Any>()) }
        try {
          handler.postDelayed(timeout, 5000)
          ContextCompat.startForegroundService(context, Intent(context, EchoVoiceService::class.java))
        } catch (error: Exception) {
          handler.removeCallbacks(timeout)
          EchoVoiceService.onReady = null
          promise.reject("VOICE_SERVICE", error.message, error)
        }
      }
    }

    Function("hasHeadphones") {
      val context = appContext.reactContext ?: return@Function false
      val manager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      manager.getDevices(AudioManager.GET_DEVICES_OUTPUTS).any {
        it.type in arrayOf(AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
          AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
          AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_BLE_HEADSET)
      }
    }

    Function("stop") {
      EchoVoiceService.onStopped = null
      appContext.reactContext?.let { it.stopService(Intent(it, EchoVoiceService::class.java)) }
    }

    OnDestroy {
      EchoVoiceService.onStopped = null
      EchoVoiceService.onReady = null
      appContext.reactContext?.let { it.stopService(Intent(it, EchoVoiceService::class.java)) }
    }
  }
}
