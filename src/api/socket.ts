import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function connectSocket(absHost: string, token: string): Socket {
  if (socket) socket.disconnect()
  socket = io(absHost, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

export function onSocketEvent<T = unknown>(event: string, handler: (data: T) => void) {
  const target = socket
  target?.on(event, handler)
  return () => target?.off(event, handler)
}

export function getSocket(): Socket | null {
  return socket
}
