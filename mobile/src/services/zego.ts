import { findNodeHandle } from "react-native";
import type ZegoExpressEngineType from "zego-express-engine-reactnative";
import type {
  ZegoRoomConfig,
  ZegoStream,
  ZegoTextureView as ZegoTextureViewType,
} from "zego-express-engine-reactnative";

export interface ZegoRemoteStreamInfo {
  streamID: string;
  userID: string;
  userName: string;
}

export interface ZegoServiceCallbacks {
  onRoomStateUpdate?: (
    roomID: string,
    state: number,
    errorCode: number,
    extendedData: string
  ) => void;
  onRoomStreamUpdate?: (
    roomID: string,
    updateType: "ADD" | "DELETE",
    streams: ZegoRemoteStreamInfo[]
  ) => void;
  onPublisherStateUpdate?: (
    streamID: string,
    state: number,
    errorCode: number
  ) => void;
  onPlayerStateUpdate?: (
    streamID: string,
    state: number,
    errorCode: number
  ) => void;
  onDebugError?: (errorCode: number, funcName: string, info: string) => void;
}

interface ZegoRuntimeModule {
  default: typeof ZegoExpressEngineType;
  ZegoTextureView: typeof ZegoTextureViewType;
  ZegoScenario: {
    StandardVideoCall: number;
    StandardVoiceCall: number;
  };
  ZegoUpdateType: {
    Add: number;
    Delete: number;
  };
  ZegoViewMode: {
    AspectFit: number;
    AspectFill: number;
    ScaleToFill: number;
  };
  ZegoPublishChannel: {
    Main: number;
  };
}

let cachedZegoModule: ZegoRuntimeModule | null = null;

/**
 * Safely lazy-loads `zego-express-engine-reactnative` only when explicitly invoked
 * outside Expo Go (e.g. inside an EAS APK or native dev client).
 */
function loadZegoModule(): ZegoRuntimeModule {
  if (cachedZegoModule) return cachedZegoModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("zego-express-engine-reactnative") as ZegoRuntimeModule;
    if (!mod || !mod.default) {
      throw new Error("ZegoExpressEngine export missing from native module.");
    }
    cachedZegoModule = mod;
    return mod;
  } catch (err: any) {
    throw new Error(
      err?.message ||
        "ZegoExpressEngine native module unavailable. Use an EAS APK build for real audio/video."
    );
  }
}

class ZegoService {
  private engine: ZegoExpressEngineType | null = null;
  private isInitialized = false;
  private currentRoomId: string | null = null;
  private currentLocalStreamId: string | null = null;
  private activeRemoteStreams: Set<string> = new Set();

  /**
   * Returns the native ZegoTextureView component class lazily when running outside Expo Go.
   */
  public getTextureViewComponent(): typeof ZegoTextureViewType | null {
    try {
      const mod = loadZegoModule();
      return mod.ZegoTextureView || null;
    } catch {
      return null;
    }
  }

  /**
   * Sanitizes arbitrary IDs into strictly alphanumeric + underscore strings for Zego streamIDs.
   */
  public sanitizeStreamPart(value: string): string {
    return String(value || "")
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .slice(0, 48);
  }

  public buildStreamId(roomId: string, userId: string): string {
    return `stream_${this.sanitizeStreamPart(roomId)}_${this.sanitizeStreamPart(userId)}`;
  }

  public async initAndJoinRoom(params: {
    appId: number;
    roomId: string;
    userId: string;
    userName: string;
    token: string;
    callType: "audio" | "video";
    callbacks?: ZegoServiceCallbacks;
  }): Promise<{ localStreamId: string }> {
    const { appId, roomId, userId, userName, token, callType, callbacks } = params;

    if (!appId || Number.isNaN(appId) || appId <= 0) {
      throw new Error(
        "Missing valid ZEGO App ID (EXPO_PUBLIC_ZEGO_APP_ID / backend appId)."
      );
    }
    if (!token || token.startsWith("04mock_")) {
      throw new Error(
        "Server returned an invalid or mock Zego Token04. Verify ZEGO_APP_ID and ZEGO_SERVER_SECRET on Render."
      );
    }

    const mod = loadZegoModule();
    const ZegoExpressEngine = mod.default;

    // Ensure clean slate if a previous session left an active engine
    await this.destroy();

    // 1. Create Engine with StandardVideoCall (supports both voice & mid-call video upgrades)
    const engine = await ZegoExpressEngine.createEngineWithProfile({
      appID: Number(appId),
      appSign: "",
      scenario: mod.ZegoScenario.StandardVideoCall as any,
    });

    this.engine = engine;
    this.isInitialized = true;
    this.currentRoomId = roomId;

    // 2. Register SDK callbacks before logging into room
    if (callbacks?.onRoomStateUpdate) {
      engine.on("roomStateUpdate", (rId, state, errorCode, extendedData) => {
        callbacks.onRoomStateUpdate?.(rId, state, errorCode, extendedData);
      });
    }

    if (callbacks?.onRoomStreamUpdate) {
      engine.on("roomStreamUpdate", (rId, updateType, streamList: ZegoStream[]) => {
        const mapped: ZegoRemoteStreamInfo[] = (streamList || []).map((s) => ({
          streamID: s.streamID,
          userID: s.user?.userID || "",
          userName: s.user?.userName || "Participant",
        }));
        const typeStr =
          updateType === mod.ZegoUpdateType.Add ? "ADD" : "DELETE";
        callbacks.onRoomStreamUpdate?.(rId, typeStr, mapped);
      });
    }

    if (callbacks?.onPublisherStateUpdate) {
      engine.on("publisherStateUpdate", (streamID, state, errorCode) => {
        callbacks.onPublisherStateUpdate?.(streamID, state, errorCode);
      });
    }

    if (callbacks?.onPlayerStateUpdate) {
      engine.on("playerStateUpdate", (streamID, state, errorCode) => {
        callbacks.onPlayerStateUpdate?.(streamID, state, errorCode);
      });
    }

    if (callbacks?.onDebugError) {
      engine.on("debugError", (errorCode, funcName, info) => {
        callbacks.onDebugError?.(errorCode, funcName, info);
      });
    }

    // 3. Log into room with Zego Token04
    const roomConfig: ZegoRoomConfig = {
      maxMemberCount: 0,
      isUserStatusNotify: true,
      token,
    };

    const loginResult = await engine.loginRoom(
      roomId,
      { userID: userId, userName: userName || "LandConnect User" },
      roomConfig
    );

    if (loginResult && typeof loginResult.errorCode === "number" && loginResult.errorCode !== 0) {
      throw new Error(
        `Room login failed (Zego errorCode ${loginResult.errorCode}): ${
          loginResult.extendedData || "Token or AppID rejected"
        }`
      );
    }

    // 4. Configure mic, speaker audio routing, and camera state
    await engine.muteMicrophone(false);
    await engine.setAudioRouteToSpeaker(callType === "video");
    await engine.enableCamera(
      callType === "video",
      mod.ZegoPublishChannel.Main as any
    );
    if (callType === "video") {
      await engine.useFrontCamera(true, mod.ZegoPublishChannel.Main as any);
    }

    // 5. Publish local audio/video stream
    const localStreamId = this.buildStreamId(roomId, userId);
    this.currentLocalStreamId = localStreamId;
    await engine.startPublishingStream(
      localStreamId,
      mod.ZegoPublishChannel.Main as any,
      undefined
    );

    return { localStreamId };
  }

  public async startLocalPreview(viewRef: any): Promise<boolean> {
    if (!this.engine || !this.isInitialized || !viewRef) return false;
    try {
      const mod = loadZegoModule();
      const reactTag = findNodeHandle(viewRef);
      if (!reactTag) return false;

      await this.engine.startPreview(
        {
          reactTag,
          viewMode: mod.ZegoViewMode.AspectFill as any,
          backgroundColor: 0x0b2b26,
        },
        mod.ZegoPublishChannel.Main as any
      );
      return true;
    } catch (err) {
      console.warn("[ZegoService] startLocalPreview warning:", err);
      return false;
    }
  }

  public async stopLocalPreview(): Promise<void> {
    if (!this.engine || !this.isInitialized) return;
    try {
      const mod = loadZegoModule();
      await this.engine.stopPreview(mod.ZegoPublishChannel.Main as any);
    } catch {}
  }

  public async startPlayingRemoteStream(
    streamID: string,
    viewRef?: any
  ): Promise<boolean> {
    if (!this.engine || !this.isInitialized || !streamID) return false;
    try {
      const mod = loadZegoModule();
      let canvas: any = undefined;

      if (viewRef) {
        const reactTag = findNodeHandle(viewRef);
        if (reactTag) {
          canvas = {
            reactTag,
            viewMode: mod.ZegoViewMode.AspectFill as any,
            backgroundColor: 0x0b2b26,
          };
        }
      }

      await this.engine.startPlayingStream(streamID, canvas, undefined);
      this.activeRemoteStreams.add(streamID);
      return true;
    } catch (err) {
      console.warn(`[ZegoService] startPlayingStream(${streamID}) failed:`, err);
      return false;
    }
  }

  public async stopPlayingRemoteStream(streamID: string): Promise<void> {
    this.activeRemoteStreams.delete(streamID);
    if (!this.engine || !this.isInitialized) return;
    try {
      await this.engine.stopPlayingStream(streamID);
    } catch {}
  }

  public async setMicMuted(muted: boolean): Promise<void> {
    if (!this.engine || !this.isInitialized) return;
    await this.engine.muteMicrophone(muted);
  }

  public async setSpeakerEnabled(enabled: boolean): Promise<void> {
    if (!this.engine || !this.isInitialized) return;
    await this.engine.setAudioRouteToSpeaker(enabled);
  }

  public async setCameraEnabled(enabled: boolean, previewRef?: any): Promise<void> {
    if (!this.engine || !this.isInitialized) return;
    const mod = loadZegoModule();
    await this.engine.enableCamera(enabled, mod.ZegoPublishChannel.Main as any);
    if (enabled && previewRef) {
      await this.startLocalPreview(previewRef);
    } else if (!enabled) {
      await this.stopLocalPreview();
    }
  }

  public async setFrontCamera(front: boolean): Promise<void> {
    if (!this.engine || !this.isInitialized) return;
    const mod = loadZegoModule();
    await this.engine.useFrontCamera(front, mod.ZegoPublishChannel.Main as any);
  }

  public async destroy(): Promise<void> {
    const engineRef = this.engine;
    const roomRef = this.currentRoomId;
    const remoteList = Array.from(this.activeRemoteStreams);

    this.engine = null;
    this.isInitialized = false;
    this.currentRoomId = null;
    this.currentLocalStreamId = null;
    this.activeRemoteStreams.clear();

    if (!engineRef) return;

    try {
      const mod = loadZegoModule();
      const ZegoExpressEngine = mod.default;

      try {
        await engineRef.stopPreview(mod.ZegoPublishChannel.Main as any);
      } catch {}

      try {
        await engineRef.stopPublishingStream(mod.ZegoPublishChannel.Main as any);
      } catch {}

      for (const streamID of remoteList) {
        try {
          await engineRef.stopPlayingStream(streamID);
        } catch {}
      }

      if (roomRef) {
        try {
          await engineRef.logoutRoom(roomRef);
        } catch {}
      }

      try {
        engineRef.off("roomStateUpdate", undefined);
        engineRef.off("roomStreamUpdate", undefined);
        engineRef.off("publisherStateUpdate", undefined);
        engineRef.off("playerStateUpdate", undefined);
        engineRef.off("debugError", undefined);
      } catch {}

      await ZegoExpressEngine.destroyEngine();
    } catch (err) {
      console.warn("[ZegoService] destroy warning:", err);
    }
  }
}

export const zegoService = new ZegoService();
