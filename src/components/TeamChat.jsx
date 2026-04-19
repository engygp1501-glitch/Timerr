import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { Send, Hash, Info, UserRound } from 'lucide-react';

export default function TeamChat({ isDashboard = false }) {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const messagesRef = ref(db, 'messages');
    return onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const msgList = Object.entries(data)
          .map(([id, msg]) => ({ id, ...msg }))
          .sort((a, b) => a.timestamp - b.timestamp);
        // Only keep last 100 messages for memory limits
        setMessages(msgList.slice(-100));
      } else {
        setMessages([]);
      }
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await push(ref(db, 'messages'), {
        text: newMessage,
        senderId: userProfile.uid,
        senderName: userProfile.name,
        role: userProfile.role,
        timestamp: Date.now(),
        type: 'chat'
      });
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  }

  const avatarColors = ['#4f46e5','#7c3aed','#2563eb','#0891b2','#059669','#d97706','#dc2626','#be185d'];
  function getAvatarColor(str) {
    let hash = 0;
    for (let i = 0; i < (str||'').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  }

  function formatTime(ts) {
    if (!ts) return '';
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(ts));
  }

  return (
    <div className={`card-static ${isDashboard ? 'animate-slideUp' : ''}`} style={{ 
      display: 'flex', flexDirection: 'column', height: isDashboard ? 'calc(100vh - 140px)' : '100%', 
      background: 'var(--bg-card)', overflow: 'hidden' 
    }}>
      {/* Header */}
      <div style={{ 
        padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card-hover)' 
      }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Hash size={18} color="#4f46e5" />
        </div>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>team-general</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Company-wide chat and activity feed.</p>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Hash size={32} color="#e2e8f0" style={{ margin: '0 auto 12px auto' }} />
            <p>Welcome to the beginning of the #team-general channel.</p>
          </div>
        )}
        
        {messages.map((msg, index) => {
          const isSystem = msg.type === 'system';
          const isConsecutive = index > 0 && messages[index-1].senderId === msg.senderId && messages[index-1].type === 'chat' && !isSystem && (msg.timestamp - messages[index-1].timestamp < 300000);
          
          if (isSystem) {
            return (
              <div key={msg.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--bg-card-hover)', borderRadius: '12px', margin: '4px 0' }}>
                <Info size={16} color="#6366f1" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-muted-darker)', fontStyle: 'italic' }}>
                  <strong style={{ color: '#334155', fontWeight: '600' }}>{msg.senderName}</strong> {msg.text}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{formatTime(msg.timestamp)}</span>
              </div>
            );
          }

          return (
            <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: isConsecutive ? '-12px' : '0' }}>
              {!isConsecutive ? (
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: getAvatarColor(msg.senderName), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
                  {msg.senderName?.[0]?.toUpperCase()}
                </div>
              ) : (
                <div style={{ width: '36px', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                {!isConsecutive && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>{msg.senderName}</span>
                    {msg.role === 'admin' && <span style={{ padding: '2px 6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '10px', fontWeight: '700', borderRadius: '4px', textTransform: 'uppercase' }}>Admin</span>}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatTime(msg.timestamp)}</span>
                  </div>
                )}
                <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.5', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px' }}>
          <input 
            className="form-input" 
            placeholder="Message #team-general..." 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)}
            style={{ flex: 1, background: 'var(--bg-card-hover)', padding: '12px 16px' }}
          />
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={!newMessage.trim()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', padding: 0, opacity: !newMessage.trim() ? 0.6 : 1 }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
