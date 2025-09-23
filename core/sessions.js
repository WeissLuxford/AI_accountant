// core/sessions.js

const sessions = new Map()

export function getSession(sid) {
  if (!sessions.has(sid)) {
    sessions.set(sid, { messages: [], state: {}, lastAt: Date.now() })
  }
  return sessions.get(sid)
}

export function touchSession(sess) {
  sess.lastAt = Date.now()
}

export function pushMessages(sess, newMessages) {
  for (const m of newMessages) {
    if (m && m.role && m.content) {
      sess.messages.push({ role: m.role, content: String(m.content) })
    }
  }
}

export function trimHistory(sess, limit) {
  if (sess.messages.length > limit) {
    sess.messages = sess.messages.slice(-limit)
  }
}

// периодическая очистка старых сессий
setInterval(() => {
  const ttl = 1000 * 60 * 60
  const now = Date.now()
  for (const [k, v] of sessions) {
    if (now - v.lastAt > ttl) sessions.delete(k)
  }
}, 10 * 60 * 1000)
