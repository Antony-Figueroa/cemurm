// Demo notes store.
//
// The template shipped this context with SWR calls to /api/notes/* endpoints
// that only existed in an MSW worker nobody starts, so the page always loaded
// empty. The demo now keeps the template's fixed content in React state: no
// network calls, no Supabase writes, and every change is lost on reload. The
// notes screen renders a demo notice that says exactly that.
import { createContext, useState } from 'react';
import React from 'react';
import { demoNotes } from '@/demo/content';
import { notesType } from 'src/types/apps/notes';

// Define context type
interface NotesContextType {
  notes: notesType[];
  loading: boolean;
  error: Error | null;
  selectedNoteId: number;
  selectNote: (id: number) => void;
  addNote: (newNote: notesType) => Promise<void>;
  updateNote: (id: number, title: string, color: string) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;
}

const initialContext: NotesContextType = {
  notes: demoNotes,
  loading: false,
  error: null,
  selectedNoteId: demoNotes[0]?.id ?? 1,
  selectNote: () => {},
  addNote: async () => {},
  updateNote: async () => {},
  deleteNote: async () => {},
};

export const NotesContext = createContext<NotesContextType>(initialContext);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<notesType[]>(demoNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<number>(
    demoNotes[0]?.id ?? 1,
  );

  const selectNote = (id: number) => {
    setSelectedNoteId(id);
  };

  const addNote = async (newNote: notesType) => {
    const nextId = notes.reduce((max, note) => Math.max(max, note.id), 0) + 1;
    const created: notesType = {
      ...newNote,
      id: nextId,
      datef: new Date().toISOString(),
      deleted: false,
    };
    setNotes((current) => [created, ...current]);
    setSelectedNoteId(nextId);
  };

  const updateNote = async (id: number, title: string, color: string) => {
    setNotes((current) =>
      current.map((note) =>
        note.id === id ? { ...note, title, color } : note,
      ),
    );
  };

  const deleteNote = async (id: number) => {
    const remaining = notes.filter((note) => note.id !== id);
    setNotes(remaining);
    if (selectedNoteId === id) {
      setSelectedNoteId(remaining[0]?.id ?? 0);
    }
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        loading: false,
        error: null,
        selectedNoteId,
        selectNote,
        addNote,
        updateNote,
        deleteNote,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};
