import {
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  updateDoc
} from '../firebase';
import { 
  JournalEntry, 
  ChatMessage, 
  JournalSummary, 
  ActionItem, 
  WeeklyReflection, 
  UserPrivacySettings, 
  JournalMode 
} from '../types';

export const firestoreService = {
  // ==========================================
  // JOURNALS
  // ==========================================

  async createJournal(
    userId: string, 
    mode: JournalMode, 
    customTitle?: string
  ): Promise<JournalEntry> {
    if (!userId) throw new Error('User ID is required');

    const journalId = `jnl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const journalRef = doc(db, 'users', userId, 'journals', journalId);

    const now = Date.now();
    const defaultTitles: Record<JournalMode, string> = {
      free_journal: 'Daily Stream of Consciousness',
      brainstorm: 'Creative Brainstorming Session',
      reflection: 'Evening Introspection & Reflection',
      problem_solving: 'Strategic Problem Solving',
      goal_planning: 'Goal & Habit Blueprint',
      study_notes: 'Learning & Idea Notes'
    };

    const newJournal: JournalEntry = {
      id: journalId,
      userId,
      title: customTitle || defaultTitles[mode] || 'New Journal Session',
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      favorite: false,
      mode,
      messageCount: 0,
      hasSummary: false
    };

    await setDoc(journalRef, newJournal);
    return newJournal;
  },

  async getUserJournals(userId: string): Promise<JournalEntry[]> {
    if (!userId) return [];
    try {
      const journalsRef = collection(db, 'users', userId, 'journals');
      const q = query(journalsRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as JournalEntry);
    } catch (err) {
      console.warn('Fallback ordering for journals:', err);
      const journalsRef = collection(db, 'users', userId, 'journals');
      const snapshot = await getDocs(journalsRef);
      const items = snapshot.docs.map(d => d.data() as JournalEntry);
      return items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }
  },

  async getJournal(userId: string, journalId: string): Promise<JournalEntry | null> {
    if (!userId || !journalId) return null;
    const docRef = doc(db, 'users', userId, 'journals', journalId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as JournalEntry) : null;
  },

  async updateJournal(
    userId: string, 
    journalId: string, 
    updates: Partial<JournalEntry>
  ): Promise<void> {
    if (!userId || !journalId) return;
    const docRef = doc(db, 'users', userId, 'journals', journalId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Date.now()
    });
  },

  async toggleFavoriteJournal(userId: string, journalId: string, current: boolean): Promise<boolean> {
    const next = !current;
    await this.updateJournal(userId, journalId, { favorite: next });
    return next;
  },

  async deleteJournal(userId: string, journalId: string): Promise<void> {
    if (!userId || !journalId) return;
    // Delete messages subcollection
    const messagesRef = collection(db, 'users', userId, 'journals', journalId, 'messages');
    const msgSnaps = await getDocs(messagesRef);
    for (const mDoc of msgSnaps.docs) {
      await deleteDoc(mDoc.ref);
    }
    // Delete summary if exists
    const summaryRef = doc(db, 'users', userId, 'summaries', journalId);
    await deleteDoc(summaryRef).catch(() => {});

    // Delete journal doc
    const journalRef = doc(db, 'users', userId, 'journals', journalId);
    await deleteDoc(journalRef);
  },

  // ==========================================
  // MESSAGES
  // ==========================================

  async getJournalMessages(userId: string, journalId: string): Promise<ChatMessage[]> {
    if (!userId || !journalId) return [];
    try {
      const messagesRef = collection(db, 'users', userId, 'journals', journalId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as ChatMessage);
    } catch (err) {
      console.warn('Fallback ordering for messages:', err);
      const messagesRef = collection(db, 'users', userId, 'journals', journalId, 'messages');
      const snapshot = await getDocs(messagesRef);
      const items = snapshot.docs.map(d => d.data() as ChatMessage);
      return items.sort((a, b) => a.createdAt - b.createdAt);
    }
  },

  async saveMessage(
    userId: string, 
    journalId: string, 
    msg: Omit<ChatMessage, 'id'>
  ): Promise<ChatMessage> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const msgRef = doc(db, 'users', userId, 'journals', journalId, 'messages', messageId);

    const fullMessage: ChatMessage = {
      ...msg,
      id: messageId,
      journalId,
      userId
    };

    await setDoc(msgRef, fullMessage);

    // Increment message count on journal
    const journalRef = doc(db, 'users', userId, 'journals', journalId);
    const snap = await getDoc(journalRef);
    if (snap.exists()) {
      const currentCount = snap.data().messageCount || 0;
      await updateDoc(journalRef, {
        messageCount: currentCount + 1,
        lastMessageAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    return fullMessage;
  },

  async deleteMessage(userId: string, journalId: string, messageId: string): Promise<void> {
    const msgRef = doc(db, 'users', userId, 'journals', journalId, 'messages', messageId);
    await deleteDoc(msgRef);
  },

  async clearJournalMessages(userId: string, journalId: string): Promise<void> {
    const messagesRef = collection(db, 'users', userId, 'journals', journalId, 'messages');
    const msgSnaps = await getDocs(messagesRef);
    for (const mDoc of msgSnaps.docs) {
      await deleteDoc(mDoc.ref);
    }
    const journalRef = doc(db, 'users', userId, 'journals', journalId);
    await updateDoc(journalRef, {
      messageCount: 0,
      updatedAt: Date.now()
    });
  },

  // ==========================================
  // SUMMARIES
  // ==========================================

  async saveSummary(
    userId: string, 
    journalId: string, 
    summaryData: Omit<JournalSummary, 'id' | 'journalId' | 'userId'>
  ): Promise<JournalSummary> {
    const summaryId = journalId; // 1-to-1 canonical summary per journal
    const summaryRef = doc(db, 'users', userId, 'summaries', summaryId);

    const fullSummary: JournalSummary = {
      ...summaryData,
      id: summaryId,
      journalId,
      userId
    };

    await setDoc(summaryRef, fullSummary);

    // Update journal with summary status & mood
    await this.updateJournal(userId, journalId, {
      summary: fullSummary.shortSummary,
      title: fullSummary.title || undefined,
      mood: fullSummary.moodTheme || undefined,
      tags: fullSummary.mainTopics || [],
      hasSummary: true
    });

    // Also persist action items to actions collection
    if (Array.isArray(fullSummary.actionItems)) {
      for (const act of fullSummary.actionItems) {
        await this.saveActionItem(userId, {
          id: act.id,
          text: act.text,
          status: act.status || 'pending',
          journalId,
          journalTitle: fullSummary.title,
          createdAt: Date.now()
        });
      }
    }

    return fullSummary;
  },

  async getSummary(userId: string, journalId: string): Promise<JournalSummary | null> {
    if (!userId || !journalId) return null;
    const summaryRef = doc(db, 'users', userId, 'summaries', journalId);
    const snap = await getDoc(summaryRef);
    return snap.exists() ? (snap.data() as JournalSummary) : null;
  },

  async getAllUserSummaries(userId: string): Promise<JournalSummary[]> {
    if (!userId) return [];
    try {
      const summariesRef = collection(db, 'users', userId, 'summaries');
      const q = query(summariesRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as JournalSummary);
    } catch {
      const summariesRef = collection(db, 'users', userId, 'summaries');
      const snap = await getDocs(summariesRef);
      const list = snap.docs.map(d => d.data() as JournalSummary);
      return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  },

  // ==========================================
  // ACTION ITEMS
  // ==========================================

  async saveActionItem(userId: string, action: ActionItem): Promise<void> {
    const actionRef = doc(db, 'users', userId, 'actions', action.id);
    await setDoc(actionRef, action, { merge: true });
  },

  async getActionItems(userId: string): Promise<ActionItem[]> {
    if (!userId) return [];
    try {
      const actionsRef = collection(db, 'users', userId, 'actions');
      const snap = await getDocs(actionsRef);
      return snap.docs.map(d => d.data() as ActionItem);
    } catch (err) {
      console.error('Error fetching actions:', err);
      return [];
    }
  },

  async updateActionItemStatus(
    userId: string, 
    actionId: string, 
    status: 'pending' | 'in_progress' | 'completed'
  ): Promise<void> {
    const actionRef = doc(db, 'users', userId, 'actions', actionId);
    await updateDoc(actionRef, {
      status,
      completedAt: status === 'completed' ? Date.now() : null
    });
  },

  async deleteActionItem(userId: string, actionId: string): Promise<void> {
    const actionRef = doc(db, 'users', userId, 'actions', actionId);
    await deleteDoc(actionRef);
  },

  // ==========================================
  // WEEKLY INSIGHTS & REFLECTIONS
  // ==========================================

  async saveWeeklyReflection(userId: string, reflection: WeeklyReflection): Promise<void> {
    const refDoc = doc(db, 'users', userId, 'insights', reflection.id);
    await setDoc(refDoc, reflection);
  },

  async getWeeklyReflections(userId: string): Promise<WeeklyReflection[]> {
    if (!userId) return [];
    try {
      const colRef = collection(db, 'users', userId, 'insights');
      const snap = await getDocs(colRef);
      const list = snap.docs.map(d => d.data() as WeeklyReflection);
      return list.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  },

  // ==========================================
  // PRIVACY SETTINGS
  // ==========================================

  async getPrivacySettings(userId: string): Promise<UserPrivacySettings> {
    const defaultSettings: UserPrivacySettings = {
      enableInsights: true,
      enableMoodTracking: true,
      autoSaveSummaries: true,
      retentionNoticeAcknowledged: true
    };
    if (!userId) return defaultSettings;

    try {
      const docRef = doc(db, 'users', userId, 'settings', 'privacy');
      const snap = await getDoc(docRef);
      return snap.exists() ? { ...defaultSettings, ...(snap.data() as UserPrivacySettings) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  },

  async savePrivacySettings(userId: string, settings: Partial<UserPrivacySettings>): Promise<void> {
    if (!userId) return;
    const docRef = doc(db, 'users', userId, 'settings', 'privacy');
    await setDoc(docRef, settings, { merge: true });
  },

  // ==========================================
  // BULK DELETE / PRIVACY WIPE
  // ==========================================

  async deleteAllUserData(userId: string): Promise<void> {
    if (!userId) return;

    // 1. Delete all journals and their messages
    const journalsRef = collection(db, 'users', userId, 'journals');
    const jSnaps = await getDocs(journalsRef);
    for (const jDoc of jSnaps.docs) {
      const msgsRef = collection(db, 'users', userId, 'journals', jDoc.id, 'messages');
      const mSnaps = await getDocs(msgsRef);
      for (const mDoc of mSnaps.docs) {
        await deleteDoc(mDoc.ref);
      }
      await deleteDoc(jDoc.ref);
    }

    // 2. Delete all summaries
    const summariesRef = collection(db, 'users', userId, 'summaries');
    const sSnaps = await getDocs(summariesRef);
    for (const sDoc of sSnaps.docs) {
      await deleteDoc(sDoc.ref);
    }

    // 3. Delete all actions
    const actionsRef = collection(db, 'users', userId, 'actions');
    const aSnaps = await getDocs(actionsRef);
    for (const aDoc of aSnaps.docs) {
      await deleteDoc(aDoc.ref);
    }

    // 4. Delete insights
    const insightsRef = collection(db, 'users', userId, 'insights');
    const iSnaps = await getDocs(insightsRef);
    for (const iDoc of iSnaps.docs) {
      await deleteDoc(iDoc.ref);
    }

    // 5. Delete settings
    const settingsRef = collection(db, 'users', userId, 'settings');
    const setSnaps = await getDocs(settingsRef);
    for (const setDoc of setSnaps.docs) {
      await deleteDoc(setDoc.ref);
    }
  }
};
