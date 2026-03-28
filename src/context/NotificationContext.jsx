import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const startTimeRef = useRef(new Date());
  const usersWithIdsRef = useRef(new Set()); // Track users who already had IDs on load
  const initialLoadDoneRef = useRef(false);   // True once first snapshot processed
  const { user } = useAuth();

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Create a simple notification beep using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure sound: pleasant notification tone
      oscillator.frequency.value = 800; // Hz - higher pitch for notification
      oscillator.type = 'sine'; // Smooth sine wave
      
      // Volume envelope (fade in and out)
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01); // Quick fade in
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3); // Fade out
      
      // Play the sound
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3); // Short beep (300ms)
      
      console.log('🔔 Notification sound played');
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  const addNotifications = (newItems) => {
    setNotifications(prev => {
      // Create a set of existing notification identifiers (not just IDs, but meaningful keys)
      const existingKeys = new Set(
        prev.map(n => {
          // Generate a unique key based on type and actual item ID (not the notification ID)
          if (n.type === 'report') return `report_${n.reportId}`;
          if (n.type === 'service_request') return `service_${n.serviceRequestId}`;
          if (n.type === 'borrow_request') return `borrow_${n.borrowerId}`;
          if (n.type === 'lost_item') return `lost_${n.lostItemId}`;
          if (n.type === 'found_item') return `found_${n.foundItemId}`;
          if (n.type === 'user' && n.subType === 'id_submitted') return `user_id_${n.userId}`;
          if (n.type === 'user') return `user_${n.userId}`;
          if (n.type === 'feedback' && n.reportId) return `feedback_report_${n.reportId}`;
          if (n.type === 'feedback' && n.serviceRequestId) return `feedback_service_${n.serviceRequestId}`;
          if (n.type === 'feedback' && n.feedbackId) return `feedback_${n.feedbackId}`;
          return n.id; // Fallback to notification ID
        })
      );
      
      // Filter new items to only include those we haven't seen before
      const uniqueNew = newItems.filter(n => {
        let key;
        if (n.type === 'report') key = `report_${n.reportId}`;
        else if (n.type === 'service_request') key = `service_${n.serviceRequestId}`;
        else if (n.type === 'borrow_request') key = `borrow_${n.borrowerId}`;
        else if (n.type === 'lost_item') key = `lost_${n.lostItemId}`;
        else if (n.type === 'found_item') key = `found_${n.foundItemId}`;
        else if (n.type === 'user' && n.subType === 'id_submitted') key = `user_id_${n.userId}`;
        else if (n.type === 'user') key = `user_${n.userId}`;
        else if (n.type === 'feedback' && n.reportId) key = `feedback_report_${n.reportId}`;
        else if (n.type === 'feedback' && n.serviceRequestId) key = `feedback_service_${n.serviceRequestId}`;
        else if (n.type === 'feedback' && n.feedbackId) key = `feedback_${n.feedbackId}`;
        else key = n.id;
        
        return !existingKeys.has(key);
      });
      
      if (uniqueNew.length === 0) return prev;
      
      // Play notification sound for new notifications
      if (uniqueNew.length > 0) {
        playNotificationSound();
      }
      
      const merged = [...uniqueNew, ...prev].sort((a, b) => b.createdAt - a.createdAt);
      setUnreadCount(merged.filter(n => !n.read).length);
      return merged;
    });
  };

  // Listen to reports
  useEffect(() => {
    if (!user) return;
    try {
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.docChanges().forEach(change => {
          const data = change.doc.data();
          
          // NEW REPORT NOTIFICATION
          if (change.type === 'added') {
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
            if (createdAt >= startTimeRef.current) {
              items.push({
                id: `report_${change.doc.id}`,
                type: 'report',
                title: '📋 New Report Submitted',
                message: `${data.reporterName || data.userName || 'A user'} submitted a ${data.category || 'general'} report`,
                createdAt,
                read: false,
                link: '/reports',
                reportId: change.doc.id
              });
            }
          }
          
          // FEEDBACK NOTIFICATION (when report is modified with rating)
          if (change.type === 'modified') {
            const rating = data.rating;
            // Check if rating exists and was recently added
            if (rating && rating > 0) {
              const ratedAt = data.ratedAt?.toDate ? data.ratedAt.toDate() : data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date();
              // Only notify if rating was added recently (after app started)
              if (ratedAt >= startTimeRef.current) {
                items.push({
                  id: `feedback_${change.doc.id}_${Date.now()}`, // Unique ID with timestamp
                  type: 'feedback',
                  title: '⭐ New Feedback Received',
                  message: `${data.userName || data.reporterName || 'A user'} left a ${rating}-star review on their report`,
                  createdAt: ratedAt,
                  read: false,
                  link: '/reports',
                  reportId: change.doc.id
                });
                console.log('✅ New feedback detected:', {
                  user: data.userName || data.reporterName,
                  rating,
                  ratedAt,
                  reportId: change.doc.id
                });
              }
            }
          }
        });
        if (items.length > 0) {
          console.log('📬 Adding notifications:', items.map(i => i.title));
          addNotifications(items);
        }
      }, (err) => console.error('Notification reports error:', err));
      return () => unsub();
    } catch (err) { console.error(err); }
  }, [user]);

  // Listen to service_requests
  useEffect(() => {
    if (!user) return;
    try {
      const q = query(collection(db, 'service_requests'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.docChanges().forEach(change => {
          const data = change.doc.data();
          
          // NEW SERVICE REQUEST NOTIFICATION
          if (change.type === 'added') {
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
            if (createdAt >= startTimeRef.current) {
              items.push({
                id: `service_${change.doc.id}`,
                type: 'service_request',
                title: '🛎️ New Service Request',
                message: `${data.requestedBy || 'A user'} requested ${data.serviceType || 'a service'}`,
                createdAt,
                read: false,
                link: '/reports',
                serviceRequestId: change.doc.id  // Store ID for direct navigation
              });
            }
          }
          
          // FEEDBACK NOTIFICATION FOR SERVICE REQUESTS (when modified with rating)
          if (change.type === 'modified') {
            const rating = data.rating;
            if (rating && rating > 0) {
              const ratedAt = data.ratedAt?.toDate ? data.ratedAt.toDate() : data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date();
              if (ratedAt >= startTimeRef.current) {
                items.push({
                  id: `service_feedback_${change.doc.id}_${Date.now()}`,
                  type: 'feedback',
                  title: '⭐ New Service Feedback',
                  message: `${data.requestedBy || data.userName || 'A user'} rated service: ${rating} stars`,
                  createdAt: ratedAt,
                  read: false,
                  link: '/reports',
                  serviceRequestId: change.doc.id,
                  activeTab: 'service_requests'
                });
                console.log('✅ New service feedback detected:', {
                  user: data.requestedBy || data.userName,
                  rating,
                  ratedAt,
                  feedbackId: change.doc.id
                });
              }
            }
          }
        });
        if (items.length > 0) {
          console.log('📬 Adding service notifications:', items.map(i => i.title));
          addNotifications(items);
        }
      }, (err) => console.error('Notification service_requests error:', err));
      return () => unsub();
    } catch (err) { console.error(err); }
  }, [user]);

  // Listen to borrowed_supplies (pending borrow requests) - Grouped by borrower
  useEffect(() => {
    if (!user) return;
    try {
      const q = query(collection(db, 'borrowed_supplies'), orderBy('borrowedAt', 'desc'));
      const borrowerNotifications = new Map(); // Track notifications by borrower
      
      const unsub = onSnapshot(q, (snapshot) => {
        const items = [];
        const newBorrowers = new Map(); // Track borrowers with new items
        
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const createdAt = data.borrowedAt?.toDate ? data.borrowedAt.toDate() : new Date(data.borrowedAt || Date.now());
            
            if (createdAt >= startTimeRef.current) {
              const borrowerId = data.borrowerId || data.userId || 'unknown';
              const borrowerName = data.borrowerName || 'Someone';
              
              // Count items for this borrower
              if (!newBorrowers.has(borrowerId)) {
                newBorrowers.set(borrowerId, { name: borrowerName, count: 0, createdAt });
              }
              newBorrowers.get(borrowerId).count++;
            }
          }
        });
        
        // Create one notification per borrower
        newBorrowers.forEach((borrowerData, borrowerId) => {
          const notificationId = `borrow_${borrowerId}`;
          
          // Only add if we haven't already notified about this borrower
          if (!borrowerNotifications.has(notificationId)) {
            borrowerNotifications.set(notificationId, true);
            
            items.push({
              id: notificationId,
              type: 'borrow_request',
              title: '🛍️ New Borrow Request',
              message: `${borrowerData.name} requested to borrow ${borrowerData.count} item${borrowerData.count > 1 ? 's' : ''}`,
              createdAt: borrowerData.createdAt,
              read: false,
              link: '/reports',
              borrowerId: borrowerId,  // Store borrower ID for navigation
              borrowerName: borrowerData.name
            });
          }
        });
        
        if (items.length > 0) addNotifications(items);
      }, (err) => console.error('Notification borrowed_supplies error:', err));
      return () => unsub();
    } catch (err) { console.error(err); }
  }, [user]);

  // Listen to lost_items (new reports + ratings)
  useEffect(() => {
    if (!user) return;
    try {
      const q = query(collection(db, 'lost_items'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.docChanges().forEach(change => {
          const data = change.doc.data();

          // NEW LOST ITEM REPORT
          if (change.type === 'added') {
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
            if (createdAt >= startTimeRef.current) {
              items.push({
                id: `lost_${change.doc.id}`,
                type: 'lost_item',
                title: '🔍 New Lost Item Report',
                message: `${data.reporterName || data.userName || 'A user'} reported a lost ${data.itemName || 'item'}`,
                createdAt,
                read: false,
                link: '/lost-found',
                lostItemId: change.doc.id
              });
            }
          }

          // RATING LEFT ON LOST/FOUND ITEM
          if (change.type === 'modified') {
            const rating = data.rating;
            if (rating && rating > 0) {
              const ratedAt = data.ratedAt?.toDate ? data.ratedAt.toDate()
                : data.updatedAt?.toDate ? data.updatedAt.toDate()
                : new Date();
              if (ratedAt >= startTimeRef.current) {
                items.push({
                  id: `lost_feedback_${change.doc.id}_${Date.now()}`,
                  type: 'feedback',
                  title: '⭐ New Lost & Found Rating',
                  message: `${data.reporterName || data.userName || 'A user'} left a ${rating}-star review for "${data.itemName || 'an item'}"`,
                  createdAt: ratedAt,
                  read: false,
                  link: '/feedback',
                  lostItemId: change.doc.id
                });
                console.log('✅ Lost item rating detected:', {
                  user: data.reporterName || data.userName,
                  rating,
                  item: data.itemName,
                  id: change.doc.id
                });
              }
            }
          }
        });
        if (items.length > 0) addNotifications(items);
      }, (err) => console.error('Notification lost_items error:', err));
      return () => unsub();
    } catch (err) { console.error(err); }
  }, [user]);

  // Listen to found_items
  useEffect(() => {
    if (!user) return;
    try {
      const q = query(collection(db, 'found_items'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
            if (createdAt >= startTimeRef.current) {
              items.push({
                id: `found_${change.doc.id}`,
                type: 'found_item',
                title: '✅ New Found Item Report',
                message: `${data.reporterName || data.userName || 'A user'} reported finding a ${data.itemName || 'item'}`,
                createdAt,
                read: false,
                link: '/lost-found',
                foundItemId: change.doc.id  // Store ID for direct navigation
              });
            }
          }
        });
        if (items.length > 0) addNotifications(items);
      }, (err) => console.error('Notification found_items error:', err));
      return () => unsub();
    } catch (err) { console.error(err); }
  }, [user]);

  // Listen to new pending users and ID updates
  useEffect(() => {
    if (!user) return;
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const items = [];

        snapshot.docChanges().forEach(change => {
          const data = change.doc.data();
          const docId = change.doc.id;

          const getIdUrl = (d) =>
            d.idImageUrl || d.validIdUrl || d.idPhotoUrl || d.idImage ||
            d.selfieUrl || d.photoIdUrl || d.idUrl || d.validId ||
            d.idPhoto || d.submitIdUrl || d.submitIdImage || d.idImageURL || null;

          // --- INITIAL LOAD: build the "already has ID" set, no notifications ---
          if (!initialLoadDoneRef.current && change.type === 'added') {
            if (getIdUrl(data)) {
              usersWithIdsRef.current.add(docId);
            }
            return; // Don't create notifications during initial hydration
          }

          // NEW USER REGISTRATION (all users including Google sign-in)
          if (change.type === 'added') {
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
            if (createdAt >= startTimeRef.current) {
              const isGoogle = data.provider === 'google' || data.authProvider === 'google' || data.signInMethod === 'google' || data.googleSignIn === true;
              const userName = data.displayName || data.firstName || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : null) || data.email || 'A new user';
              items.push({
                id: `user_${docId}`,
                type: 'user',
                title: isGoogle ? '🔵 New Google Sign-in' : '👤 New User Registration',
                message: isGoogle
                  ? `${userName} signed in with Google — tap to view details`
                  : `${userName} is waiting for approval`,
                createdAt,
                read: false,
                link: '/users',
                userId: docId
              });
            }
            // If new user already came with an ID, track them so modified won't re-fire
            if (getIdUrl(data)) {
              usersWithIdsRef.current.add(docId);
            }
          }

          // ID SUBMITTED: only when ID field appears for the first time
          if (change.type === 'modified') {
            const idUrl = getIdUrl(data);

            if (idUrl && !usersWithIdsRef.current.has(docId)) {
              // First time this user has an ID — fire notification
              usersWithIdsRef.current.add(docId);
              const submittedAt = data.updatedAt?.toDate ? data.updatedAt.toDate()
                : data.idSubmittedAt?.toDate ? data.idSubmittedAt.toDate()
                : new Date();

              const userName = data.displayName ||
                (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}`.trim() : null) ||
                data.firstName || data.email || 'A user';

              items.push({
                id: `user_id_${docId}`,
                type: 'user',
                subType: 'id_submitted',
                title: '🆔 ID Submitted for Review',
                message: `${userName} uploaded their ID — tap to review`,
                createdAt: submittedAt,
                read: false,
                link: '/users',
                userId: docId
              });
              console.log('✅ ID submission detected for:', userName, '| userId:', docId);
            }
          }
        });

        // Mark initial load done after first snapshot is fully processed
        if (!initialLoadDoneRef.current) {
          initialLoadDoneRef.current = true;
        }

        if (items.length > 0) {
          console.log('📬 Adding user notifications:', items.map(i => i.title));
          addNotifications(items);
        }
      }, (err) => console.error('Notification users error:', err));
      return () => unsub();
    } catch (err) { console.error(err); }
  }, [user]);

  // Listen to feedback (standalone feedback collection - if used)
  useEffect(() => {
    if (!user) return;
    
    let unsub = () => {};
    
    try {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
            if (createdAt >= startTimeRef.current) {
              items.push({
                id: `feedback_standalone_${change.doc.id}`,
                type: 'feedback',
                title: '⭐ New Feedback',
                message: `${data.userName || 'A user'} left a ${data.rating}-star review`,
                createdAt,
                read: false,
                link: '/feedback',
                feedbackId: change.doc.id
              });
            }
          }
        });
        if (items.length > 0) addNotifications(items);
      }, (err) => {
        // Only log error if it's not a permission issue (feedback collection may not exist)
        if (!err.message.includes('Missing or insufficient permissions')) {
          console.error('Notification feedback error:', err);
        }
      });
    } catch (err) { 
      // Silently handle if feedback collection doesn't exist
    }
    
    return () => unsub();
  }, [user]);

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    startTimeRef.current = new Date();
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
};
