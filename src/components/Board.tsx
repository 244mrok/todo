"use client";

import { useState, useCallback, useRef } from "react";
import type { BoardData, Card, List } from "@/types/board";
import { LABEL_COLORS } from "@/types/board";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const INITIAL_BOARD: BoardData = { lists: [], cards: {}, labelNames: {} };

export default function Board() {
  const [board, setBoard] = useLocalStorage<BoardData>("trello-board-v2", INITIAL_BOARD);

  // UI state
  const [addingListTitle, setAddingListTitle] = useState("");
  const [showAddList, setShowAddList] = useState(false);
  const [addingCardListId, setAddingCardListId] = useState<string | null>(null);
  const [addingCardTitle, setAddingCardTitle] = useState("");
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState("");
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editDesc, setEditDesc] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  // Drag state
  const dragCard = useRef<{ cardId: string; sourceListId: string } | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);

  // Refs
  const addListInputRef = useRef<HTMLInputElement>(null);
  const addCardInputRef = useRef<HTMLTextAreaElement>(null);

  // ===================== LIST ACTIONS =====================

  const addList = useCallback(() => {
    if (!addingListTitle.trim()) return;
    const id = "list-" + Date.now();
    setBoard(prev => ({
      ...prev,
      lists: [...prev.lists, { id, title: addingListTitle.trim(), cardIds: [] }],
    }));
    setAddingListTitle("");
  }, [addingListTitle, setBoard]);

  const renameList = useCallback((listId: string, title: string) => {
    setBoard(prev => ({
      ...prev,
      lists: prev.lists.map(l => l.id === listId ? { ...l, title } : l),
    }));
  }, [setBoard]);

  const deleteList = useCallback((listId: string) => {
    setBoard(prev => {
      const list = prev.lists.find(l => l.id === listId);
      const newCards = { ...prev.cards };
      list?.cardIds.forEach(id => delete newCards[id]);
      return { ...prev, lists: prev.lists.filter(l => l.id !== listId), cards: newCards };
    });
  }, [setBoard]);

  // ===================== CARD ACTIONS =====================

  const addCard = useCallback((listId: string) => {
    if (!addingCardTitle.trim()) return;
    const id = "card-" + Date.now();
    const card: Card = {
      id,
      title: addingCardTitle.trim(),
      description: "",
      labels: [],
      dueDate: "",
      completed: false,
      completedAt: "",
      createdAt: new Date().toISOString(),
    };
    setBoard(prev => ({
      ...prev,
      cards: { ...prev.cards, [id]: card },
      lists: prev.lists.map(l => l.id === listId ? { ...l, cardIds: [...l.cardIds, id] } : l),
    }));
    setAddingCardTitle("");
  }, [addingCardTitle, setBoard]);

  const updateCard = useCallback((card: Card) => {
    setBoard(prev => ({ ...prev, cards: { ...prev.cards, [card.id]: card } }));
    setEditingCard(card);
  }, [setBoard]);

  const toggleCard = useCallback((cardId: string) => {
    setBoard(prev => {
      const card = prev.cards[cardId];
      if (!card) return prev;
      const nowCompleted = !card.completed;
      const updated = {
        ...card,
        completed: nowCompleted,
        completedAt: nowCompleted ? new Date().toISOString() : "",
      };
      return { ...prev, cards: { ...prev.cards, [cardId]: updated } };
    });
    setEditingCard(prev => {
      if (prev?.id !== cardId) return prev;
      const nowCompleted = !prev.completed;
      return { ...prev, completed: nowCompleted, completedAt: nowCompleted ? new Date().toISOString() : "" };
    });
  }, [setBoard]);

  const deleteCard = useCallback((cardId: string) => {
    setBoard(prev => {
      const newCards = { ...prev.cards };
      delete newCards[cardId];
      return {
        ...prev,
        cards: newCards,
        lists: prev.lists.map(l => ({
          ...l,
          cardIds: l.cardIds.filter(id => id !== cardId),
        })),
      };
    });
    setEditingCard(null);
  }, [setBoard]);

  // ===================== DRAG & DROP =====================

  const handleDragStart = (cardId: string, sourceListId: string) => {
    dragCard.current = { cardId, sourceListId };
  };

  const handleDragOver = (e: React.DragEvent, listId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverListId(listId);
  };

  const handleDragLeave = () => {
    setDragOverListId(null);
  };

  const handleDrop = (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    setDragOverListId(null);
    if (!dragCard.current) return;
    const { cardId, sourceListId } = dragCard.current;
    if (sourceListId === targetListId) return;

    setBoard(prev => ({
      ...prev,
      lists: prev.lists.map(l => {
        if (l.id === sourceListId) return { ...l, cardIds: l.cardIds.filter(id => id !== cardId) };
        if (l.id === targetListId) return { ...l, cardIds: [...l.cardIds, cardId] };
        return l;
      }),
    }));
    dragCard.current = null;
  };

  const handleDragEnd = () => {
    dragCard.current = null;
    setDragOverListId(null);
  };

  // ===================== LABEL ACTIONS =====================

  const renameLabel = useCallback((color: string, name: string) => {
    setBoard(prev => ({
      ...prev,
      labelNames: { ...prev.labelNames, [color]: name },
    }));
  }, [setBoard]);

  const getLabelName = (color: string) => board.labelNames?.[color] || "";

  // ===================== HELPERS =====================

  const getListForCard = (cardId: string) => board.lists.find(l => l.cardIds.includes(cardId));

  /** Sort: incomplete cards in original order first, then completed cards by completedAt descending */
  const getSortedCardIds = (cardIds: string[]) => {
    const incomplete = cardIds.filter(id => !board.cards[id]?.completed);
    const completed = cardIds
      .filter(id => board.cards[id]?.completed)
      .sort((a, b) => {
        const aTime = board.cards[a]?.completedAt ? new Date(board.cards[a].completedAt).getTime() : 0;
        const bTime = board.cards[b]?.completedAt ? new Date(board.cards[b].completedAt).getTime() : 0;
        return bTime - aTime; // newest completed first
      });
    return [...incomplete, ...completed];
  };

  const getVisibleCardIds = (cardIds: string[]) => {
    const sorted = getSortedCardIds(cardIds);
    if (hideCompleted) return sorted.filter(id => !board.cards[id]?.completed);
    return sorted;
  };

  // ===================== RENDER =====================

  return (
    <div className="board-root">
      {/* Header */}
      <header className="board-header">
        <div className="board-header-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <rect x="3" y="3" width="7" height="18" rx="1.5" />
            <rect x="14" y="3" width="7" height="12" rx="1.5" />
          </svg>
          <h1>Task Board</h1>
        </div>
        <button
          className={`header-toggle-btn ${hideCompleted ? "header-toggle-active" : ""}`}
          onClick={() => setHideCompleted(prev => !prev)}
        >
          {hideCompleted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
          {hideCompleted ? "Show completed" : "Hide completed"}
        </button>
      </header>

      {/* Board */}
      <div className="board-canvas">
        <div className="board-lists">
          {board.lists.map(list => (
            <div
              key={list.id}
              className={`list-wrapper ${dragOverListId === list.id ? "list-drag-over" : ""}`}
              onDragOver={e => handleDragOver(e, list.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, list.id)}
            >
              {/* List header */}
              <div className="list-header">
                {editingListId === list.id ? (
                  <input
                    className="list-title-input"
                    value={editingListTitle}
                    onChange={e => setEditingListTitle(e.target.value)}
                    onBlur={() => {
                      if (editingListTitle.trim()) renameList(list.id, editingListTitle.trim());
                      setEditingListId(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        if (editingListTitle.trim()) renameList(list.id, editingListTitle.trim());
                        setEditingListId(null);
                      }
                      if (e.key === "Escape") setEditingListId(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <h3
                    className="list-title"
                    onClick={() => { setEditingListId(list.id); setEditingListTitle(list.title); }}
                  >
                    {list.title}
                  </h3>
                )}
                <button
                  className="list-menu-btn"
                  onClick={() => { if (confirm(`Delete "${list.title}" and all its cards?`)) deleteList(list.id); }}
                  title="Delete list"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>
              </div>

              {/* Cards */}
              <div className="list-cards">
                {getVisibleCardIds(list.cardIds).map(cardId => {
                  const card = board.cards[cardId];
                  if (!card) return null;
                  const isOverdue = !card.completed && card.dueDate && new Date(card.dueDate) < new Date(new Date().toDateString());
                  return (
                    <div
                      key={card.id}
                      className={`card ${card.completed ? "card-completed" : ""} ${isOverdue ? "card-overdue" : ""}`}
                      draggable
                      onDragStart={() => handleDragStart(card.id, list.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setEditingCard(card)}
                    >
                      {card.labels.length > 0 && (
                        <div className="card-labels">
                          {card.labels.map(color => (
                            <span key={color} className="card-label" style={{ backgroundColor: LABEL_COLORS[color] || color }}>
                              {getLabelName(color) && <span className="card-label-text">{getLabelName(color)}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="card-content">
                        <button
                          className={`card-checkbox ${card.completed ? "card-checkbox-checked" : ""}`}
                          onClick={e => { e.stopPropagation(); toggleCard(card.id); }}
                          title={card.completed ? "Mark incomplete" : "Mark complete"}
                        >
                          {card.completed && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <p className={`card-title ${card.completed ? "card-title-done" : ""}`}>{card.title}</p>
                      </div>
                      {(card.dueDate || card.description) && (
                        <div className="card-badges">
                          {card.dueDate && (
                            <span className={`card-due ${card.completed ? "card-due-done" : ""} ${isOverdue ? "card-due-overdue" : ""}`}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {new Date(card.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                          {card.description && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5e6c84" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add card */}
              {addingCardListId === list.id ? (
                <div className="add-card-form">
                  <textarea
                    ref={addCardInputRef}
                    className="add-card-input"
                    placeholder="Enter a title for this card..."
                    value={addingCardTitle}
                    onChange={e => setAddingCardTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCard(list.id); }
                      if (e.key === "Escape") { setAddingCardListId(null); setAddingCardTitle(""); }
                    }}
                    autoFocus
                    rows={3}
                  />
                  <div className="add-card-actions">
                    <button className="btn-primary" onClick={() => addCard(list.id)}>Add card</button>
                    <button className="btn-icon" onClick={() => { setAddingCardListId(null); setAddingCardTitle(""); }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="add-card-btn"
                  onClick={() => { setAddingCardListId(list.id); setAddingCardTitle(""); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add a card
                </button>
              )}
            </div>
          ))}

          {/* Add list */}
          {showAddList ? (
            <div className="add-list-form">
              <input
                ref={addListInputRef}
                className="add-list-input"
                placeholder="Enter list title..."
                value={addingListTitle}
                onChange={e => setAddingListTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") addList();
                  if (e.key === "Escape") { setShowAddList(false); setAddingListTitle(""); }
                }}
                autoFocus
              />
              <div className="add-list-actions">
                <button className="btn-primary" onClick={addList}>Add list</button>
                <button className="btn-icon" onClick={() => { setShowAddList(false); setAddingListTitle(""); }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <button className="add-list-btn" onClick={() => setShowAddList(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add another list
            </button>
          )}
        </div>
      </div>

      {/* Card detail modal */}
      {editingCard && (() => {
        const parentList = getListForCard(editingCard.id);
        return (
          <div className="modal-overlay" onClick={() => { setEditingCard(null); setEditDesc(false); setShowLabelPicker(false); setShowDatePicker(false); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => { setEditingCard(null); setEditDesc(false); setShowLabelPicker(false); setShowDatePicker(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Title */}
              <div className="modal-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#42526e" strokeWidth="2" style={{ marginTop: 4, flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <div style={{ flex: 1 }}>
                  <input
                    className="modal-title-input"
                    value={editingCard.title}
                    onChange={e => updateCard({ ...editingCard, title: e.target.value })}
                  />
                  {parentList && <p className="modal-subtitle">in list <strong>{parentList.title}</strong></p>}
                </div>
              </div>

              <div className="modal-body">
                {/* Main content */}
                <div className="modal-main">
                  {/* Status */}
                  <div className="modal-section">
                    <h4 className="modal-label">Status</h4>
                    <button
                      className={`modal-status-btn ${editingCard.completed ? "modal-status-done" : ""}`}
                      onClick={() => toggleCard(editingCard.id)}
                    >
                      <span className={`modal-status-checkbox ${editingCard.completed ? "modal-status-checkbox-checked" : ""}`}>
                        {editingCard.completed && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {editingCard.completed ? "Complete" : "Mark as complete"}
                    </button>
                  </div>

                  {/* Labels */}
                  {editingCard.labels.length > 0 && (
                    <div className="modal-section">
                      <h4 className="modal-label">Labels</h4>
                      <div className="modal-labels-row">
                        {editingCard.labels.map(color => (
                          <span key={color} className="modal-label-pill" style={{ backgroundColor: LABEL_COLORS[color] || color }}>
                            {getLabelName(color) || color}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Due date */}
                  {editingCard.dueDate && (() => {
                    const isOverdue = !editingCard.completed && new Date(editingCard.dueDate) < new Date(new Date().toDateString());
                    return (
                      <div className="modal-section">
                        <h4 className="modal-label">Due date</h4>
                        <span className={`modal-due ${editingCard.completed ? "modal-due-done" : ""} ${isOverdue ? "modal-due-overdue" : ""}`}>
                          {new Date(editingCard.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          {isOverdue && <span className="modal-due-badge">OVERDUE</span>}
                          {editingCard.completed && <span className="modal-due-badge-done">COMPLETE</span>}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Description */}
                  <div className="modal-section">
                    <div className="modal-section-header">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#42526e" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      <h4 className="modal-section-title">Description</h4>
                    </div>
                    {editDesc ? (
                      <div>
                        <textarea
                          className="modal-desc-input"
                          value={editingCard.description}
                          onChange={e => updateCard({ ...editingCard, description: e.target.value })}
                          autoFocus
                          rows={4}
                          placeholder="Add a more detailed description..."
                        />
                        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                          <button className="btn-primary" onClick={() => setEditDesc(false)}>Save</button>
                          <button className="btn-text" onClick={() => setEditDesc(false)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="modal-desc-placeholder" onClick={() => setEditDesc(true)}>
                        {editingCard.description || "Add a more detailed description..."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="modal-sidebar">
                  <h4 className="modal-label">Add to card</h4>
                  <div className="modal-sidebar-actions">
                    {/* Labels */}
                    <div style={{ position: "relative" }}>
                      <button className="sidebar-btn" onClick={() => setShowLabelPicker(!showLabelPicker)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Labels
                      </button>
                      {showLabelPicker && (
                        <div className="label-picker">
                          <p className="label-picker-title">Labels</p>
                          {Object.entries(LABEL_COLORS).map(([colorKey, hex]) => {
                            const isSelected = editingCard.labels.includes(colorKey);
                            return (
                              <div key={colorKey} className="label-picker-row">
                                <button
                                  className="label-picker-toggle"
                                  onClick={() => {
                                    updateCard({
                                      ...editingCard,
                                      labels: isSelected
                                        ? editingCard.labels.filter(l => l !== colorKey)
                                        : [...editingCard.labels, colorKey],
                                    });
                                  }}
                                >
                                  <span className="label-picker-color" style={{ backgroundColor: hex }}>
                                    {getLabelName(colorKey) && (
                                      <span className="label-picker-color-text">{getLabelName(colorKey)}</span>
                                    )}
                                  </span>
                                  {isSelected && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#172b4d" strokeWidth="3" style={{ flexShrink: 0 }}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                                <button
                                  className="label-picker-edit-btn"
                                  onClick={e => {
                                    e.stopPropagation();
                                    const name = prompt(`Name for ${colorKey} label:`, getLabelName(colorKey));
                                    if (name !== null) renameLabel(colorKey, name);
                                  }}
                                  title="Edit label name"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <div style={{ position: "relative" }}>
                      <button className="sidebar-btn" onClick={() => setShowDatePicker(!showDatePicker)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Date
                      </button>
                      {showDatePicker && (
                        <div className="date-picker">
                          <p className="date-picker-title">Due date</p>
                          <input
                            type="date"
                            className="date-picker-input"
                            value={editingCard.dueDate}
                            onChange={e => updateCard({ ...editingCard, dueDate: e.target.value })}
                            autoFocus
                          />
                          <div className="date-picker-actions">
                            <button className="btn-primary" onClick={() => setShowDatePicker(false)}>Save</button>
                            {editingCard.dueDate && (
                              <button className="btn-text" onClick={() => { updateCard({ ...editingCard, dueDate: "" }); setShowDatePicker(false); }}>Remove</button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <h4 className="modal-label" style={{ marginTop: 16 }}>Actions</h4>
                  <button
                    className="sidebar-btn sidebar-btn-danger"
                    onClick={() => deleteCard(editingCard.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
