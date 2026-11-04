/**
 * Socket.IO Server Management
 * - Personal rooms (room = userId) for private notifications
 * - Server-verified identity: socket.user comes from socketAuthMiddleware (JWT at handshake)
 * - kickUserFromRooms: force a user's sockets out of rooms (call from service layer,
 *   e.g. when the user is removed/deactivated)
 */

// io instance registered by server.js so the service layer can emit events
let ioInstance = null
export const setSocketServerInstance = (io) => {
  ioInstance = io
}

/**
 * Kick ALL sockets of a user out of a specific room + notify them.
 * Usage example (in a service, after removing a user from a resource):
 *   kickUserFromRooms(userId, [`room_${resourceId}`], 'BE_YOU_WERE_REMOVED', { resourceId })
 */
export const kickUserFromRooms = (userId, roomNames, event, payload) => {
  if (!ioInstance || !userId || !Array.isArray(roomNames)) return

  for (const roomName of roomNames) {
    // Duyệt mọi socket đang kết nối của user này
    for (const [, sock] of ioInstance.sockets.sockets) {
      if (sock.user?._id?.toString() !== userId.toString()) continue
      if (!sock.rooms?.has(roomName)) continue
      sock.leave(roomName)
    }
  }

  // Báo cho chính user đó qua phòng cá nhân (room = userId)
  ioInstance.to(userId.toString()).emit(event, payload)
}

export const initSocketEvents = (socket, io) => {
  // Join private personal room - CHỈ cho phép join đúng phòng của user đã xác thực,
  // không tin userId do client gửi (tránh nghe lén thông báo của người khác)
  socket.on('FE_USER_JOIN_ROOM', () => {
    if (socket.user?._id) {
      socket.join(socket.user._id)
    }
  })

  // Leave room
  socket.on('FE_USER_LEAVE_ROOM', () => {
    if (socket.user?._id) {
      socket.leave(socket.user._id)
    }
  })

  // Broadcast example real-time event to a specific user room
  // Chỉ relay nếu người gửi là user đã xác thực
  socket.on('FE_SEND_NOTIFICATION', (data) => {
    if (!socket.user) return
    if (data?.recipientId) {
      const safeData = { ...data, senderId: socket.user._id, senderName: socket.user.displayName || socket.user.email }
      socket.to(data.recipientId.toString()).emit('BE_RECEIVE_NOTIFICATION', safeData)
    }
  })

  // Broadcast to all clients
  socket.on('FE_BROADCAST_ALL', (payload) => {
    if (!socket.user) return
    io.emit('BE_BROADCAST_ALL', payload)
  })
}
