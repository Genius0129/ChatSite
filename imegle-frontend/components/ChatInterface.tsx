'use client'

import { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'
import { HiVideoCamera, HiVideoCameraSlash, HiMicrophone, HiArrowRight, HiExclamationTriangle } from 'react-icons/hi2'
import { toast } from './Toast'
import { HiOutlineMicrophone as HiMicrophoneOff, HiOutlineVideoCamera as HiVideoCameraOff } from 'react-icons/hi'

interface ChatInterfaceProps {
  socket: Socket
  onBack: () => void
}

export default function ChatInterface({ socket, onBack }: ChatInterfaceProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [messages, setMessages] = useState<Array<{ text: string; isLocal: boolean }>>([])
  const [messageInput, setMessageInput] = useState('')
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isWaiting, setIsWaiting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [webrtcFailed, setWebrtcFailed] = useState<boolean>(false)
  const [isRetrying, setIsRetrying] = useState<boolean>(false)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const iceServersRef = useRef<RTCIceServer[]>([])
  const roomIdRef = useRef<string | null>(null)
  const isInitiatorRef = useRef<boolean>(false)
  const hasReceivedOfferRef = useRef<boolean>(false)
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const isInitializingRef = useRef<boolean>(false)
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isDisconnectingRef = useRef<boolean>(false)
  const webrtcRetryCountRef = useRef<number>(0)
  const webrtcRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxWebrtcRetries = 3

  useEffect(() => {
    // Get WebRTC config from server
    socket.on('webrtc-config', (config: { iceServers: RTCIceServer[] }) => {
      iceServersRef.current = config.iceServers
    })

    // Handle match found
    socket.on('match-found', async (data: { roomId: string; partnerId: string }) => {
      console.log('✅ Match found! Room:', data.roomId, 'Partner:', data.partnerId)
      
      // Clean up any existing connection first
      if (peerConnectionRef.current) {
        console.log('🧹 Cleaning up existing peer connection before new match')
        cleanup()
      }
      
      // Reset state
      setRoomId(data.roomId)
      roomIdRef.current = data.roomId // Set ref immediately for synchronous access
      setPartnerId(data.partnerId)
      setIsWaiting(false)
      setRemoteStream(null)
      setError(null) // Clear any previous errors
      setWebrtcFailed(false) // Reset failure state for new match
      setIsRetrying(false) // Reset retry state
      pendingIceCandidatesRef.current = []
      hasReceivedOfferRef.current = false
      isInitializingRef.current = false
      webrtcRetryCountRef.current = 0 // Reset retry count for new match
      if (webrtcRetryTimeoutRef.current) {
        clearTimeout(webrtcRetryTimeoutRef.current)
        webrtcRetryTimeoutRef.current = null
      }
      
      // Determine who should be the initiator (lower socket ID creates offer)
      // This prevents both peers from creating offers simultaneously
      // Guard: Ensure both socket IDs exist before comparison
      const mySocketId = socket?.id
      const partnerSocketId = data?.partnerId
      
      if (!mySocketId || !partnerSocketId) {
        console.warn('⚠️ Cannot determine initiator role: missing socket IDs', {
          mySocketId,
          partnerSocketId,
        })
        // Default to not being initiator if IDs are missing
        isInitiatorRef.current = false
        return
      }
      
      const shouldInitiate = mySocketId < partnerSocketId
      isInitiatorRef.current = shouldInitiate
      
      console.log(`🎯 Role: ${shouldInitiate ? 'Initiator' : 'Answerer'} (my ID: ${mySocketId}, partner ID: ${partnerSocketId})`)
      
      // Request media permissions when match is found (user is ready)
      let currentLocalStream = localStream
      if (!currentLocalStream) {
        console.log('📹 No local stream, requesting media...')
        currentLocalStream = await initializeMedia()
        console.log('📹 initializeMedia returned:', currentLocalStream ? 'stream' : 'null')
      }
      // Initialize WebRTC connection with roomId
      await initializeWebRTC(data.roomId, shouldInitiate, currentLocalStream)
    })

    // Handle waiting
    socket.on('waiting', () => {
      setIsWaiting(true)
    })

    // Handle partner disconnected
    socket.on('partner-disconnected', () => {
      console.log('⚠️ Partner disconnected event received')
      
      // Don't immediately disconnect - check if socket is still connected
      // This prevents false disconnections during reconnection
      if (!socket.connected) {
        console.log('   Socket not connected, waiting for reconnection...')
        // Wait a bit for reconnection
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current)
        }
        disconnectTimeoutRef.current = setTimeout(() => {
          if (!socket.connected && !isDisconnectingRef.current) {
            console.log('   Socket still not connected after wait, partner truly disconnected')
            isDisconnectingRef.current = true
            setError('Partner disconnected. Returning to dashboard...')
            cleanup()
            setTimeout(() => {
              onBack()
            }, 2000)
          }
        }, 3000) // Wait 3 seconds for reconnection
      } else {
        // Socket is connected, partner truly left
        console.log('   Socket connected, partner truly disconnected')
        isDisconnectingRef.current = true
        setError('Partner disconnected. Returning to dashboard...')
        cleanup()
        setTimeout(() => {
          onBack()
        }, 2000)
      }
    })
    
    // Handle socket reconnection
    socket.on('connect', () => {
      console.log('✅ Socket reconnected')
      if (isDisconnectingRef.current) {
        console.log('   Cancelling disconnect - connection restored')
        isDisconnectingRef.current = false
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current)
          disconnectTimeoutRef.current = null
        }
        setError(null)
      }
    })
    
    // Handle socket disconnection (not partner, but our own connection)
    socket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected:', reason)
      // Don't immediately go back - socket.io will try to reconnect
      // Only show error if it's a permanent disconnect
      if (reason === 'io server disconnect') {
        // Server disconnected us, probably intentional
        setError('Disconnected from server. Returning to dashboard...')
        cleanup()
        setTimeout(() => {
          onBack()
        }, 2000)
      } else {
        // Temporary disconnect, wait for reconnection
        setError('Connection lost. Attempting to reconnect...')
      }
    })
    
    socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Socket reconnected after ${attemptNumber} attempts`)
      setError(null)
      // Connection restored, continue chat
    })
    
    socket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error)
      setError('Reconnection failed. Please refresh the page.')
    })
    
    socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed completely')
      setError('Connection lost. Returning to dashboard...')
      cleanup()
      setTimeout(() => {
        onBack()
      }, 3000)
    })

    // Handle WebRTC signaling
    socket.on('webrtc-offer', async (data: { offer: RTCSessionDescriptionInit; from: string }) => {
      console.log('📥 Received WebRTC offer from:', data.from)
      
      // If we haven't created a peer connection yet, create one now (we're the answerer)
      if (!peerConnectionRef.current) {
        console.log('📥 No peer connection exists, creating one as answerer...')
        const currentRoomId = roomIdRef.current || roomId
        if (currentRoomId) {
          // Get local stream first if not available
          let currentLocalStream = localStream
          if (!currentLocalStream) {
            console.log('📹 No local stream, requesting media for answerer...')
            currentLocalStream = await initializeMedia()
          }
          await initializeWebRTC(currentRoomId, false, currentLocalStream)
        }
      }
      
      if (peerConnectionRef.current) {
        try {
          const currentState = peerConnectionRef.current.signalingState
          console.log('📥 Current signaling state:', currentState)
          
          // Only set remote description if we're in the right state
          if (currentState === 'stable' || currentState === 'have-local-offer') {
            // If we have a local offer, we shouldn't receive an offer (both initiated)
            // In this case, we should ignore this offer or handle it differently
            if (currentState === 'have-local-offer') {
              console.warn('⚠️ Received offer but we already have a local offer. Ignoring.')
              return
            }
            
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer))
            console.log('✅ Remote description set')
            hasReceivedOfferRef.current = true
            
            // Apply any pending ICE candidates now that remote description is set
            if (pendingIceCandidatesRef.current.length > 0) {
              console.log(`🧊 Applying ${pendingIceCandidatesRef.current.length} pending ICE candidates`)
              for (const candidate of pendingIceCandidatesRef.current) {
                try {
                  await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                } catch (err) {
                  console.warn('⚠️ Error adding pending ICE candidate:', err)
                }
              }
              pendingIceCandidatesRef.current = []
            }
            
            // Verify tracks are added before creating answer
            const sendersBeforeAnswer = peerConnectionRef.current.getSenders()
            console.log('📤 Creating answer, senders before answer:', sendersBeforeAnswer.length)
            
            const answer = await peerConnectionRef.current.createAnswer()
            
            // Log answer details to see if it includes media
            console.log('📤 Answer created, SDP type:', answer.type)
            console.log('   SDP includes video:', answer.sdp?.includes('m=video') ? 'yes' : 'no')
            console.log('   SDP includes audio:', answer.sdp?.includes('m=audio') ? 'yes' : 'no')
            
            await peerConnectionRef.current.setLocalDescription(answer)
            console.log('📤 Sending WebRTC answer...')
            const currentRoomId = roomIdRef.current || roomId
            if (currentRoomId) {
              socket.emit('webrtc-answer', { answer, roomId: currentRoomId })
              console.log('✅ Answer sent to room:', currentRoomId)
            } else {
              console.error('❌ No roomId, cannot send answer')
            }
          } else {
            console.warn(`⚠️ Cannot set remote offer in state: ${currentState}`)
          }
        } catch (err: any) {
          console.error('❌ Error handling WebRTC offer:', err)
          if (err.name === 'InvalidStateError') {
            console.error('   Current state:', peerConnectionRef.current.signalingState)
          }
        }
      } else {
        console.warn('⚠️ Received offer but no peer connection exists')
      }
    })

    socket.on('webrtc-answer', async (data: { answer: RTCSessionDescriptionInit; from: string }) => {
      console.log('📥 Received WebRTC answer from:', data.from)
      if (peerConnectionRef.current) {
        try {
          const currentState = peerConnectionRef.current.signalingState
          console.log('📥 Current signaling state:', currentState)
          
          // Only set remote answer if we're in "have-local-offer" state
          if (currentState === 'have-local-offer') {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))
            console.log('✅ Answer remote description set')
            
            // Apply any pending ICE candidates now that remote description is set
            if (pendingIceCandidatesRef.current.length > 0) {
              console.log(`🧊 Applying ${pendingIceCandidatesRef.current.length} pending ICE candidates`)
              for (const candidate of pendingIceCandidatesRef.current) {
                try {
                  await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                } catch (err) {
                  console.warn('⚠️ Error adding pending ICE candidate:', err)
                }
              }
              pendingIceCandidatesRef.current = []
            }
          } else {
            console.warn(`⚠️ Cannot set remote answer in state: ${currentState}. Expected: have-local-offer`)
          }
        } catch (err: any) {
          console.error('❌ Error setting answer remote description:', err)
          if (err.name === 'InvalidStateError') {
            console.error('   Current state:', peerConnectionRef.current.signalingState)
            console.error('   Expected state: have-local-offer')
          }
        }
      } else {
        console.warn('⚠️ Received answer but no peer connection exists')
      }
    })

    socket.on('webrtc-ice-candidate', async (data: { candidate: RTCIceCandidateInit; from: string }) => {
      console.log('🧊 Received ICE candidate from:', data.from)
      if (!peerConnectionRef.current || !data.candidate) {
        console.warn('⚠️ Received ICE candidate but no peer connection or candidate is null')
        return
      }
      
      try {
        const currentState = peerConnectionRef.current.signalingState
        // Can only add ICE candidates if remote description is set (not in 'stable' or 'have-local-offer' without remote)
        // Actually, we can add candidates in 'stable' if we're waiting for remote description
        // The safest approach is to queue them if remote description isn't set yet
        
        if (currentState === 'stable' && !peerConnectionRef.current.remoteDescription) {
          // Queue the candidate until remote description is set
          console.log('📥 Queueing ICE candidate (waiting for remote description)')
          pendingIceCandidatesRef.current.push(data.candidate)
        } else {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
          console.log('✅ ICE candidate added')
        }
      } catch (err: any) {
        // If error is because remote description isn't set, queue it
        if (err.message?.includes('remote description') || err.name === 'InvalidStateError') {
          console.log('📥 Queueing ICE candidate (remote description not ready)')
          pendingIceCandidatesRef.current.push(data.candidate)
        } else {
          console.error('❌ Error adding ICE candidate:', err)
        }
      }
    })

    // Handle messages
    socket.on('new-message', (data: { message: string; from: string }) => {
      // Only add if it's from the partner (not our own message)
      // The 'from' field contains the socket ID of the sender
      if (data.from !== socket.id) {
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some(msg => msg.text === data.message && !msg.isLocal)
          if (exists) return prev
          return [...prev, { text: data.message, isLocal: false }]
        })
      }
    })

    socket.on('message-blocked', () => {
      alert('Message was blocked by filter')
    })

    // Don't initialize media on mount - wait until match is found
    // This prevents permission prompts before user is ready

    return () => {
      // Clean up socket listeners
      socket.off('webrtc-config')
      socket.off('match-found')
      socket.off('waiting')
      socket.off('partner-disconnected')
      socket.off('connect')
      socket.off('disconnect')
      socket.off('reconnect')
      socket.off('reconnect_error')
      socket.off('reconnect_failed')
      socket.off('webrtc-offer')
      socket.off('webrtc-answer')
      socket.off('webrtc-ice-candidate')
      socket.off('new-message')
      socket.off('message-blocked')
      
      // Clear any pending timeouts
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current)
      }
      
      cleanup()
    }
  }, [socket])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Ensure remote video plays when stream is set
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log('🔄 useEffect: remoteStream changed, updating video element')
      console.log('   Stream active:', remoteStream.active)
      console.log('   Video tracks:', remoteStream.getVideoTracks().length)
      console.log('   Video tracks enabled:', remoteStream.getVideoTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState })))
      
      // Only update if srcObject is different
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        console.log('   Setting new srcObject')
        remoteVideoRef.current.srcObject = remoteStream
      } else {
        console.log('   srcObject already set, skipping')
      }
      
      // Always try to play (in case it was paused)
      remoteVideoRef.current.play().then(() => {
        console.log('✅ Remote video play() succeeded')
        console.log('   Video element state:', {
          paused: remoteVideoRef.current?.paused,
          readyState: remoteVideoRef.current?.readyState,
          videoWidth: remoteVideoRef.current?.videoWidth,
          videoHeight: remoteVideoRef.current?.videoHeight
        })
      }).catch(err => {
        // Ignore AbortError - it's usually harmless (interrupted by new load)
        if (err.name !== 'AbortError') {
          console.error('❌ Error playing remote video:', err)
        } else {
          console.log('⚠️ Play interrupted (AbortError - usually harmless)')
        }
      })
    } else if (remoteStream && !remoteVideoRef.current) {
      console.warn('⚠️ remoteStream exists but remoteVideoRef.current is null')
    }
  }, [remoteStream])

  // Ensure local video plays when stream is set
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      // Only update if srcObject is different
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream
      }
      // Play only if not already playing
      if (localVideoRef.current.paused) {
        localVideoRef.current.play().catch(err => {
          // Ignore AbortError - it's usually harmless (interrupted by new load)
          if (err.name !== 'AbortError') {
            console.error('Error playing local video:', err)
          }
        })
      }
    }
  }, [localStream])

  const initializeMedia = async (): Promise<MediaStream | null> => {
    try {
      // Check if browser supports getUserMedia
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Check for legacy API
        const getUserMedia = 
          (navigator as any).getUserMedia || 
          (navigator as any).webkitGetUserMedia || 
          (navigator as any).mozGetUserMedia ||
          (navigator as any).msGetUserMedia

        if (!getUserMedia) {
          console.warn('getUserMedia not supported, continuing with text chat only')
          setError(null) // Don't show error, just work without media
          return null
        }
      }

      // Check if HTTPS (required for getUserMedia except localhost/127.0.0.1)
      // Browsers treat localhost and 127.0.0.1 as secure contexts even on HTTP
      // However, local network IPs (192.168.x.x) may still require HTTPS in some browsers
      const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      const isLocalNetwork = location.hostname.startsWith('192.168.') || 
                             location.hostname.startsWith('10.') ||
                             location.hostname.startsWith('172.')
      const isSecureContext = 
        typeof window !== 'undefined' && (
          window.isSecureContext || 
          location.protocol === 'https:' || 
          isLocalhost
        )

      // Special case: Local network IPs on HTTP may not work in all browsers
      if (isLocalNetwork && location.protocol === 'http:' && !window.isSecureContext) {
        const errorMsg = 'Camera/microphone permissions are disabled because the site is using HTTP on a local network IP.\n\nBrowsers require HTTPS (or localhost) to enable camera/microphone permissions.\n\nSolutions:\n1. Use localhost: http://localhost:3000 (if accessing from same machine)\n2. Set up HTTPS (see instructions below)\n3. Use text chat only (works without permissions)'
        setError(errorMsg)
        toast.error('HTTPS required for camera/microphone on network IPs')
        return null
      }

      if (!isSecureContext && !isLocalhost) {
        console.warn('Not a secure context, continuing with text chat only')
        setError('HTTPS is required for camera/microphone access. Text chat is still available.')
        return null
      }

      // Request media access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled,
      })
      
      console.log('✅ Media access granted, stream:', {
        id: stream.id,
        active: stream.active,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      })
      
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      setError(null) // Clear any previous errors
      return stream // Return the stream immediately
    } catch (err: any) {
      console.error('Error accessing media:', err)
      
      // Show helpful error messages for permission issues
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        const errorMsg = 'Camera/microphone permission denied. Your browser has blocked access to your camera and microphone.\n\nYou can still use text chat, but video/audio won\'t work until you allow permissions.'
        setError(errorMsg)
        toast.error('Camera/microphone permission denied. Check browser settings.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera/microphone found. Please connect a device to use video chat. Text chat is still available.')
        toast.warning('No camera/microphone detected')
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera/microphone is being used by another application. Please close other apps and refresh the page.')
        toast.error('Camera/microphone is in use by another app')
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        // Fallback to audio only
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          console.log('✅ Audio-only stream obtained')
          setLocalStream(audioStream)
          setIsVideoEnabled(false)
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = audioStream
          }
          setError('Video not available, but audio chat is working.')
          toast.info('Connected with audio only')
          return audioStream // Return the stream
        } catch (audioErr) {
          setError('Could not access camera/microphone. Text chat is still available.')
          toast.warning('Media access failed, text chat available')
          return null
        }
      } else {
        // For any other error, show a message
        setError(`Media access failed: ${err.message || 'Unknown error'}. Text chat is still available.`)
        toast.warning('Media access failed, text chat available')
        return null
      }
    }
    return null
  }

  const initializeWebRTC = async (currentRoomId?: string, shouldCreateOffer: boolean = true, providedStream?: MediaStream | null) => {
    // Use provided roomId or fall back to state/ref
    const activeRoomId = currentRoomId || roomIdRef.current || roomId
    if (!activeRoomId) {
      console.error('❌ Cannot initialize WebRTC: no roomId available')
      return
    }
    
    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current) {
      console.log('⚠️ WebRTC initialization already in progress, skipping')
      return
    }
    
    // Don't create a new peer connection if one already exists and is valid
    if (peerConnectionRef.current) {
      const state = peerConnectionRef.current.connectionState
      if (state !== 'closed' && state !== 'failed') {
        console.log('⚠️ Peer connection already exists and is active, skipping initialization')
        return
      } else {
        console.log('🧹 Cleaning up failed/closed peer connection')
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
    }
    
    isInitializingRef.current = true
    
    console.log('🔌 Initializing WebRTC for room:', activeRoomId, shouldCreateOffer ? '(as initiator)' : '(as answerer)')
    
    // Use provided stream, or state, or try to get media
    let currentLocalStream = providedStream || localStream
    if (!currentLocalStream) {
      console.log('📹 No local stream available, requesting media...')
      currentLocalStream = await initializeMedia()
    }

    // Continue even without local stream - we can still receive remote video/audio
    // and use text chat
    if (!currentLocalStream) {
      console.log('⚠️ No local media stream, but WebRTC will still work for receiving remote media')
    } else {
      console.log('✅ Local stream available for WebRTC:', {
        id: currentLocalStream.id,
        videoTracks: currentLocalStream.getVideoTracks().length,
        audioTracks: currentLocalStream.getAudioTracks().length
      })
    }

    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current.length > 0 
        ? iceServersRef.current 
        : [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    // Add local stream tracks (if available)
    // IMPORTANT: Tracks must be added BEFORE creating offer/answer
    // Use currentLocalStream (from parameter or state) instead of localStream state
    if (currentLocalStream) {
      const videoTracks = currentLocalStream.getVideoTracks()
      const audioTracks = currentLocalStream.getAudioTracks()
      
      console.log('📹 Adding local tracks to peer connection:', {
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        videoTrackIds: videoTracks.map(t => t.id),
        audioTrackIds: audioTracks.map(t => t.id)
      })
      
      currentLocalStream.getTracks().forEach(track => {
        console.log(`   Adding ${track.kind} track:`, {
          id: track.id,
          enabled: track.enabled,
          readyState: track.readyState
        })
        const sender = pc.addTrack(track, currentLocalStream)
        console.log(`   ✅ Added ${track.kind} track, sender:`, {
          track: sender.track?.id,
          transport: sender.transport?.state
        })
      })
      
      // Verify tracks were added
      const senders = pc.getSenders()
      console.log('📊 Total senders after adding tracks:', senders.length)
      senders.forEach((sender, idx) => {
        console.log(`   Sender ${idx}:`, {
          track: sender.track ? {
            kind: sender.track.kind,
            id: sender.track.id,
            enabled: sender.track.enabled
          } : 'null'
        })
      })
    } else {
      console.log('⚠️ No local stream, creating recvonly transceivers')
      // Even without local media, we can create a transceiver for receiving
      // This allows us to receive remote video/audio even if we don't send
      const videoTransceiver = pc.addTransceiver('video', { direction: 'recvonly' })
      const audioTransceiver = pc.addTransceiver('audio', { direction: 'recvonly' })
      console.log('✅ Created recvonly transceivers:', {
        video: videoTransceiver.direction,
        audio: audioTransceiver.direction
      })
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('🎥 Remote track received:', {
        kind: event.track.kind,
        id: event.track.id,
        enabled: event.track.enabled,
        readyState: event.track.readyState,
        streams: event.streams,
        streamCount: event.streams.length
      })
      
      if (event.streams && event.streams.length > 0) {
        const stream = event.streams[0]
        console.log('📹 Remote stream details:', {
          id: stream.id,
          active: stream.active,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
          videoTrackIds: stream.getVideoTracks().map(t => t.id),
          audioTrackIds: stream.getAudioTracks().map(t => t.id)
        })
        
        setRemoteStream(stream)
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
          console.log('✅ Remote video stream set to video element')
          
          // Force play
          remoteVideoRef.current.play().then(() => {
            console.log('✅ Remote video playing')
          }).catch(err => {
            console.error('❌ Error playing remote video:', err)
          })
        } else {
          console.warn('⚠️ remoteVideoRef.current is null')
        }
      } else {
        console.warn('⚠️ No streams in ontrack event')
      }
    }

    // Add connection state logging - manual recovery only
    pc.onconnectionstatechange = () => {
      console.log('🔌 WebRTC connection state:', pc.connectionState)
      if (pc.connectionState === 'failed') {
        console.error('❌ WebRTC connection failed')
        setWebrtcFailed(true)
        setError('WebRTC connection failed. Click "Retry Connection" to attempt recovery. Text chat is still available.')
      } else if (pc.connectionState === 'connected') {
        console.log('✅ WebRTC connected!')
        // Clear failure state on successful connection
        setWebrtcFailed(false)
        setIsRetrying(false)
        webrtcRetryCountRef.current = 0
        if (webrtcRetryTimeoutRef.current) {
          clearTimeout(webrtcRetryTimeoutRef.current)
          webrtcRetryTimeoutRef.current = null
        }
        // Only clear error if it was a WebRTC error
        if (error?.includes('WebRTC connection failed')) {
          setError(null)
        }
      } else if (pc.connectionState === 'disconnected') {
        console.warn('⚠️ WebRTC disconnected - may recover automatically')
        // Connection might recover, don't show error yet
      } else if (pc.connectionState === 'connecting') {
        console.log('🔄 WebRTC connecting...')
        // Clear WebRTC error while connecting (but keep other errors)
        if (error?.includes('WebRTC connection failed')) {
          setError(null)
        }
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', pc.iceConnectionState)
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('✅ ICE connection established!')
        // Check if we have any remote tracks
        const receivers = pc.getReceivers()
        console.log('📊 Remote receivers:', receivers.length)
        receivers.forEach((receiver, idx) => {
          console.log(`   Receiver ${idx}:`, {
            track: receiver.track ? {
              kind: receiver.track.kind,
              id: receiver.track.id,
              enabled: receiver.track.enabled,
              readyState: receiver.track.readyState,
              muted: receiver.track.muted
            } : 'null'
          })
        })
      } else if (pc.iceConnectionState === 'failed') {
        console.error('❌ ICE connection failed')
        // Don't automatically recover - let user click retry button
        setWebrtcFailed(true)
        if (pc.connectionState === 'failed') {
          setError('WebRTC connection failed. Click "Retry Connection" to attempt recovery. Text chat is still available.')
        } else {
          setError('ICE connection failed. Click "Retry Connection" to attempt recovery.')
        }
      } else if (pc.iceConnectionState === 'disconnected') {
        console.warn('⚠️ ICE disconnected - may recover automatically')
        // ICE might recover, wait a bit before showing error
        setTimeout(() => {
          if (pc.iceConnectionState === 'failed' && pc.connectionState !== 'connected') {
            console.log('🔄 ICE still disconnected after wait')
            setWebrtcFailed(true)
            if (pc.connectionState === 'failed') {
              setError('WebRTC connection failed. Click "Retry Connection" to attempt recovery. Text chat is still available.')
            }
          }
        }, 3000) // Wait 3 seconds to see if it recovers
      } else if (pc.iceConnectionState === 'checking') {
        console.log('🧊 ICE checking - gathering candidates...')
        // Reset retry count on successful ICE connection (handled in the 'connected'/'completed' case above)
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      const currentRoomId = roomIdRef.current || roomId
      if (event.candidate && currentRoomId) {
        console.log('🧊 Sending ICE candidate...')
        socket.emit('webrtc-ice-candidate', {
          candidate: event.candidate,
          roomId: currentRoomId,
        })
      } else if (event.candidate) {
        console.warn('⚠️ ICE candidate generated but no roomId')
      } else {
        console.log('✅ All ICE candidates sent')
      }
    }

    peerConnectionRef.current = pc
    isInitializingRef.current = false

    // Only create and send offer if we're the initiator
    if (shouldCreateOffer && !hasReceivedOfferRef.current) {
      try {
        // Verify tracks are added before creating offer
        const sendersBeforeOffer = pc.getSenders()
        console.log('📤 Creating WebRTC offer (as initiator)...')
        console.log('   Senders before offer:', sendersBeforeOffer.length)
        
        const offer = await pc.createOffer()
        
        // Log offer details to see if it includes media
        console.log('📤 Offer created, SDP type:', offer.type)
        console.log('   SDP includes video:', offer.sdp?.includes('m=video') ? 'yes' : 'no')
        console.log('   SDP includes audio:', offer.sdp?.includes('m=audio') ? 'yes' : 'no')
        
        await pc.setLocalDescription(offer)
        console.log('📤 WebRTC offer created, sending to partner...')
        
        const currentRoomId = activeRoomId
        if (currentRoomId) {
          socket.emit('webrtc-offer', { offer, roomId: currentRoomId })
          console.log('✅ Offer sent to room:', currentRoomId)
        } else {
          console.error('❌ No roomId, cannot send offer')
          setError('Failed to send WebRTC offer. Text chat will still work.')
        }
      } catch (err) {
        console.error('❌ Error creating WebRTC offer:', err)
        setError('Failed to create WebRTC offer. Text chat will still work.')
        // Continue anyway - text chat will still work
      }
    } else if (hasReceivedOfferRef.current) {
      console.log('📥 Already received offer, waiting to create answer...')
    } else {
      console.log('📥 Waiting for offer from partner (we are answerer)...')
    }
  }

  const cleanup = () => {
    console.log('🧹 Cleaning up WebRTC resources...')
    
    // Stop tracks but don't stop the stream (user might want to reuse it)
    // Actually, we should stop tracks when leaving chat
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop()
        console.log(`   Stopped ${track.kind} track`)
      })
    }
    
    if (peerConnectionRef.current) {
      // Close all transceivers
      peerConnectionRef.current.getTransceivers().forEach(transceiver => {
        transceiver.stop()
      })
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
      console.log('   Closed peer connection')
    }
    
    // Clear remote stream from video element
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    
    setLocalStream(null)
    setRemoteStream(null)
    
    // Reset WebRTC flags
    isInitiatorRef.current = false
    hasReceivedOfferRef.current = false
    pendingIceCandidatesRef.current = []
    isInitializingRef.current = false
    isDisconnectingRef.current = false
    webrtcRetryCountRef.current = 0
    setWebrtcFailed(false)
    setIsRetrying(false)
    
    // Clear all timeouts
    if (disconnectTimeoutRef.current) {
      clearTimeout(disconnectTimeoutRef.current)
      disconnectTimeoutRef.current = null
    }
    if (webrtcRetryTimeoutRef.current) {
      clearTimeout(webrtcRetryTimeoutRef.current)
      webrtcRetryTimeoutRef.current = null
    }
    
    console.log('✅ Cleanup complete')
  }

  const toggleVideo = async () => {
    // If no stream exists, try to get media
    if (!localStream) {
      console.log('No local stream, requesting media...')
      await initializeMedia()
      // If still no stream after request, can't enable video
      if (!localStream) {
        toast.warning('Could not access camera. Please check your camera permissions and try again.')
        return
      }
    }

    // Toggle video track
    const videoTrack = localStream?.getVideoTracks()[0]
    if (videoTrack) {
      const newState = !isVideoEnabled
      videoTrack.enabled = newState
      setIsVideoEnabled(newState)
      
      // If enabling video and we have a peer connection, update it
      if (newState && peerConnectionRef.current) {
        // Replace the video track in the peer connection
        const sender = peerConnectionRef.current.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        )
        if (sender && localStream) {
          const newVideoTrack = localStream.getVideoTracks()[0]
          if (newVideoTrack) {
            await sender.replaceTrack(newVideoTrack)
          }
        }
      }
    } else if (localStream) {
      // Stream exists but no video track - try to add one
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: isAudioEnabled 
        })
        const newVideoTrack = newStream.getVideoTracks()[0]
        if (newVideoTrack && localStream) {
          localStream.addTrack(newVideoTrack)
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream
          }
          setIsVideoEnabled(true)
          
          // Add to peer connection if it exists
          if (peerConnectionRef.current) {
            peerConnectionRef.current.addTrack(newVideoTrack, localStream)
          }
        }
      } catch (err: any) {
        console.error('Failed to enable video:', err)
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          toast.error('No camera found. Please connect a camera to use video chat.')
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          toast.error('Camera permission denied. Please allow camera access in your browser settings.')
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          toast.error('Camera is being used by another application. Please close other apps and try again.')
        } else {
          toast.error(`Failed to enable video: ${err.message || 'Unknown error'}`)
        }
      }
    }
  }

  const toggleAudio = async () => {
    // If no stream exists, try to get media
    if (!localStream) {
      console.log('No local stream, requesting media...')
      await initializeMedia()
      // If still no stream after request, can't enable audio
      if (!localStream) {
        toast.warning('Could not access microphone. Please check your microphone permissions and try again.')
        return
      }
    }

    // Toggle audio track
    const audioTrack = localStream?.getAudioTracks()[0]
    if (audioTrack) {
      const newState = !isAudioEnabled
      audioTrack.enabled = newState
      setIsAudioEnabled(newState)
      
      // If enabling audio and we have a peer connection, update it
      if (newState && peerConnectionRef.current) {
        // Replace the audio track in the peer connection
        const sender = peerConnectionRef.current.getSenders().find(s => 
          s.track && s.track.kind === 'audio'
        )
        if (sender && localStream) {
          const newAudioTrack = localStream.getAudioTracks()[0]
          if (newAudioTrack) {
            await sender.replaceTrack(newAudioTrack)
          }
        }
      }
    } else if (localStream) {
      // Stream exists but no audio track - try to add one
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          video: isVideoEnabled, 
          audio: true 
        })
        const newAudioTrack = newStream.getAudioTracks()[0]
        if (newAudioTrack && localStream) {
          localStream.addTrack(newAudioTrack)
          setIsAudioEnabled(true)
          
          // Add to peer connection if it exists
          if (peerConnectionRef.current) {
            peerConnectionRef.current.addTrack(newAudioTrack, localStream)
          }
        }
      } catch (err: any) {
        console.error('Failed to enable audio:', err)
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          toast.error('No microphone found. Please connect a microphone to use audio chat.')
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          toast.error('Microphone permission denied. Please allow microphone access in your browser settings.')
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          toast.error('Microphone is being used by another application. Please close other apps and try again.')
        } else {
          toast.error(`Failed to enable audio: ${err.message || 'Unknown error'}`)
        }
      }
    }
  }

  const sendMessage = () => {
    if (messageInput.trim() && roomId) {
      const messageText = messageInput.trim()
      // Don't add locally - wait for server confirmation to avoid duplicates
      // The server will echo it back if needed, or we'll add it when we receive it
      socket.emit('send-message', { message: messageText, roomId })
      // Add locally immediately for better UX (will be deduplicated by server)
      setMessages(prev => [...prev, { text: messageText, isLocal: true }])
      setMessageInput('')
    }
  }

  const handleNext = () => {
    console.log('⏭️ Next button clicked - finding new partner...')
    
    // Emit 'next' to server - this will disconnect current partner and re-queue
    socket.emit('next')
    
    // Clean up current connection (peer connection and remote stream)
    if (peerConnectionRef.current) {
      peerConnectionRef.current.getTransceivers().forEach(transceiver => {
        transceiver.stop()
      })
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    
    // Clear remote stream
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    setRemoteStream(null)
    
    // Reset state to waiting mode
    setPartnerId(null)
    setRoomId(null)
    roomIdRef.current = null
    setMessages([]) // Clear messages
    setError(null) // Clear any errors
    setIsWaiting(true) // Show "Waiting for partner..." screen
    
    // Reset WebRTC flags
    isInitiatorRef.current = false
    hasReceivedOfferRef.current = false
    pendingIceCandidatesRef.current = []
    isInitializingRef.current = false
    isDisconnectingRef.current = false
    webrtcRetryCountRef.current = 0
    setWebrtcFailed(false)
    setIsRetrying(false)
    
    // Clear timeouts
    if (disconnectTimeoutRef.current) {
      clearTimeout(disconnectTimeoutRef.current)
      disconnectTimeoutRef.current = null
    }
    if (webrtcRetryTimeoutRef.current) {
      clearTimeout(webrtcRetryTimeoutRef.current)
      webrtcRetryTimeoutRef.current = null
    }
    
    // Keep localStream active (don't stop tracks) so it can be reused for next match
    // The server will find a new match and emit 'match-found' or 'waiting'
    console.log('✅ Reset to waiting state, server will find new match')
  }

  const handleRetryWebRTC = async () => {
    if (!roomId && !roomIdRef.current) {
      console.error('❌ Cannot retry: No roomId available')
      setError('Cannot retry: No active chat room. Please start a new chat.')
      return
    }

    if (isRetrying) {
      console.log('⏳ Retry already in progress...')
      return
    }

    console.log('🔄 Manual WebRTC retry initiated...')
    setIsRetrying(true)
    setError('Attempting to reconnect WebRTC...')
    setWebrtcFailed(false)

    try {
      const currentRoomId = roomIdRef.current || roomId
      const currentLocalStream = localStream

      if (!currentRoomId) {
        throw new Error('No roomId available')
      }

      // Clean up current failed connection
      if (peerConnectionRef.current) {
        console.log('🧹 Cleaning up failed peer connection...')
        peerConnectionRef.current.getTransceivers().forEach(transceiver => {
          transceiver.stop()
        })
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }

      // Clear remote stream
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
      }
      setRemoteStream(null)

      // Reset WebRTC flags
      hasReceivedOfferRef.current = false
      pendingIceCandidatesRef.current = []
      isInitializingRef.current = false
      webrtcRetryCountRef.current = 0

      // Wait a moment before reinitializing
      await new Promise(resolve => setTimeout(resolve, 500))

      // Reinitialize WebRTC
      console.log('🔄 Reinitializing WebRTC connection...')
      await initializeWebRTC(currentRoomId, isInitiatorRef.current, currentLocalStream)
      
      // Clear error after a moment (connection state handler will update if it fails)
      setTimeout(() => {
        if (peerConnectionRef.current?.connectionState === 'connected') {
          setError(null)
        }
      }, 2000)
    } catch (err: any) {
      console.error('❌ Manual retry failed:', err)
      setError(`Retry failed: ${err.message || 'Unknown error'}. Text chat is still available.`)
      setWebrtcFailed(true)
    } finally {
      setIsRetrying(false)
    }
  }

  const handleReport = () => {
    if (partnerId && window.confirm('Report this user for inappropriate behavior?')) {
      socket.emit('report-user', { reportedSocketId: partnerId })
      alert('User reported. Thank you for keeping imegle.io safe.')
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-lg p-4 flex justify-between items-center border-b border-white/10 flex-shrink-0">
        <h1 className="text-2xl font-bold text-white">imegle.io</h1>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
        >
          Leave Chat
        </button>
      </div>

      {error && (
        <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-200 p-4 m-4 rounded-lg flex-shrink-0">
          <div className="flex items-start gap-2">
            <HiExclamationTriangle className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="whitespace-pre-line">{error}</div>
              {error.includes('permission denied') && (
                <div className="mt-3 pt-3 border-t border-yellow-500/30">
                  <p className="text-sm font-semibold mb-2">Quick Fix:</p>
                  <ol className="text-sm list-decimal list-inside space-y-1">
                    <li>Click the lock icon (🔒) in your browser's address bar</li>
                    <li>Find "Camera" and "Microphone" in the permissions list</li>
                    <li>Change both from "Block" to "Allow"</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              )}
              {error.includes('HTTPS required') && (
                <div className="mt-3 pt-3 border-t border-yellow-500/30">
                  <p className="text-sm font-semibold mb-2">Setup HTTPS (Quick Guide):</p>
                  <div className="text-sm space-y-2">
                    <p><strong>Option 1: Use localhost (Easiest)</strong></p>
                    <p className="ml-4">Access via: <code className="bg-yellow-900/50 px-1 rounded">http://localhost:3000</code></p>
                    <p className="mt-2"><strong>Option 2: Setup HTTPS with mkcert</strong></p>
                    <ol className="ml-4 list-decimal list-inside space-y-1 text-xs">
                      <li>Install mkcert: <code className="bg-yellow-900/50 px-1 rounded">choco install mkcert</code> (or download from GitHub)</li>
                      <li>Run: <code className="bg-yellow-900/50 px-1 rounded">mkcert -install</code></li>
                      <li>Generate cert: <code className="bg-yellow-900/50 px-1 rounded">mkcert localhost 192.168.135.180</code></li>
                      <li>See LOCAL_DEVELOPMENT_SETUP.md for Next.js HTTPS config</li>
                    </ol>
                  </div>
                </div>
              )}
              {webrtcFailed && (
                <div className="mt-3 pt-3 border-t border-yellow-500/30">
                  <button
                    onClick={handleRetryWebRTC}
                    disabled={isRetrying}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center gap-2"
                  >
                    {isRetrying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        Retrying...
                      </>
                    ) : (
                      <>
                        <HiArrowRight className="inline" />
                        Retry Connection
                      </>
                    )}
                  </button>
                  <p className="text-xs text-yellow-300/80 mt-2">
                    If retry doesn't work, you can still use text chat or click "Next" to find a new partner.
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setError(null)
                setWebrtcFailed(false)
              }}
              className="ml-2 text-yellow-300 hover:text-yellow-100 flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {isWaiting ? (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="text-center max-w-md">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-white text-xl mb-2">Looking for someone to chat with...</p>
            <p className="text-gray-400 text-sm mb-4">
              Waiting for another user to join the queue...
            </p>
            <div className="bg-gray-800/50 rounded-lg p-4 text-left text-sm text-gray-300">
              <p className="font-semibold mb-2">💡 Testing Tip:</p>
              <p className="mb-1">To test video chat, you need <strong>2 browser windows</strong>:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Open this page in another browser window (or incognito)</li>
                <li>Start a chat in both windows</li>
                <li>You'll be matched with yourself for testing</li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 min-h-0 overflow-hidden">
          {/* Video Section */}
          <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
            {/* Remote Video */}
            <div className="relative bg-black rounded-lg overflow-hidden flex-1 min-h-0">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4">
                  <div className="text-center">
                    <div className="animate-pulse mb-4">
                      <svg className="w-16 h-16 mx-auto text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-lg mb-2">Waiting for partner's video...</p>
                    <p className="text-sm text-gray-500">
                      {peerConnectionRef.current ? (
                        <span>WebRTC connecting... ({peerConnectionRef.current.connectionState})</span>
                      ) : (
                        <span>Establishing connection...</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Local Video */}
            <div className="relative bg-black rounded-lg overflow-hidden w-full md:w-64 h-48 md:h-auto flex-shrink-0">
              {localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No video
                </div>
              )}
            </div>
          </div>

          {/* Chat Section */}
          <div className="w-full md:w-96 bg-black/50 backdrop-blur-lg rounded-lg flex flex-col border border-white/10 min-h-0 overflow-hidden flex-shrink-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        msg.isLocal
                          ? 'bg-purple-600 ml-auto max-w-[80%]'
                          : 'bg-gray-700 mr-auto max-w-[80%]'
                      }`}
                    >
                      <p className="text-white text-sm">{msg.text}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={sendMessage}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls - Always visible at bottom */}
      <div className="bg-black/50 backdrop-blur-lg p-4 flex justify-center gap-4 border-t border-white/10 flex-shrink-0">
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition ${
            isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
          } text-white`}
        >
          {isVideoEnabled ? <HiVideoCamera size={24} /> : <HiVideoCameraOff size={24} />}
        </button>
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition ${
            isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
          } text-white`}
        >
          {isAudioEnabled ? <HiMicrophone size={24} /> : <HiMicrophoneOff size={24} />}
        </button>
        <button
          onClick={handleNext}
          className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition flex items-center gap-2"
        >
          <HiArrowRight size={24} />
          <span>Next</span>
        </button>
        <button
          onClick={handleReport}
          className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition"
        >
          <HiExclamationTriangle size={24} />
        </button>
      </div>
    </div>
  )
}



