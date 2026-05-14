import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}))

import { io } from 'socket.io-client'
import { connectSocket, disconnectSocket, onSocketEvent } from './socket'

const mockIo = io as ReturnType<typeof vi.fn>

describe('socket', () => {
  beforeEach(() => mockIo.mockClear())

  it('connectSocket creates a socket with the token', () => {
    connectSocket('https://abs.example.com', 'tok123')
    expect(mockIo).toHaveBeenCalledWith('https://abs.example.com', expect.objectContaining({
      auth: { token: 'tok123' },
    }))
  })

  it('disconnectSocket calls disconnect', () => {
    const sock = connectSocket('https://abs.example.com', 'tok')
    disconnectSocket()
    expect(sock.disconnect).toHaveBeenCalled()
  })
})
