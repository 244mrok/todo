"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { BoardData, Card } from "@/types/board";
import { LABEL_COLORS } from "@/types/board";

function newBoardId() {
  return "board-" + Date.now();
}

function createEmptyBoard(): BoardData {
  return { id: newBoardId(), name: "New Project", lists: [], cards: {}, labelNames: {} };
}

export default function Board() {
  const [board, setBoard] = useState<BoardData>(createEmptyBoard);
  const [loaded, setLoaded] = useState(false);
  const dirty = useRef(false); // only save when user actually changes something
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [savedBoards, setSavedBoards] = useState<{ id: string; name: string }[]>([]);

  // Wrap setBoard to mark dirty
  const setBoardAndSave = useCallback((updater: BoardData | ((prev: BoardData) => BoardData)) => {
    dirty.current = true;
    setBoard(updater);
  }, []);

  // Load last used board or first available board on mount
  useEffect(() => {
    let cancelled = false;
    const lastId = localStorage.getItem("last-board-id");
    if (lastId) {
      fetch(`/api/board/${lastId}`)
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => { if (!cancelled && data) setBoard(data); if (!cancelled) setLoaded(true); })
        .catch(() => {
          // last board deleted? try loading list
          fetch("/api/board").then(r => r.json()).then(list => {
            if (!cancelled && list?.length > 0) {
              fetch(`/api/board/${list[0].id}`).then(r => r.json()).then(d => {
                if (!cancelled && d) { setBoard(d); localStorage.setItem("last-board-id", d.id); }
                if (!cancelled) setLoaded(true);
              });
            } else {
              if (!cancelled) setLoaded(true);
            }
          }).catch(() => { if (!cancelled) setLoaded(true); });
        });
    } else {
      // No last board — check if any exist
      fetch("/api/board").then(r => r.json()).then(list => {
        if (!cancelled && list?.length > 0) {
          fetch(`/api/board/${list[0].id}`).then(r => r.json()).then(d => {
            if (!cancelled && d) { setBoard(d); localStorage.setItem("last-board-id", d.id); }
            if (!cancelled) setLoaded(true);
          });
        } else {
          if (!cancelled) setLoaded(true);
        }
      }).catch(() => { if (!cancelled) setLoaded(true); });
    }
    return () => { cancelled = true; };
  }, []);

  // Save board to file DB on changes (debounced 500ms), only when dirty
  useEffect(() => {
    if (!loaded || !dirty.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      dirty.current = false;
      localStorage.setItem("last-board-id", board.id);
      fetch(`/api/board/${board.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(board),
      }).catch(() => {});
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [board, loaded]);

  const loadBoardList = useCallback(() => {
    fetch("/api/board")
      .then(res => res.json())
      .then(list => setSavedBoards(list || []))
      .catch(() => {});
  }, []);

  const loadBoard = useCallback((id: string) => {
    fetch(`/api/board/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setBoard(data);
          localStorage.setItem("last-board-id", id);
        }
        setShowBoardPicker(false);
      })
      .catch(() => {});
  }, []);

  const createNewBoard = useCallback(() => {
    const b = createEmptyBoard();
    dirty.current = true;
    setBoard(b);
    localStorage.setItem("last-board-id", b.id);
    setShowBoardPicker(false);
  }, []);

  const deleteBoard = useCallback((id: string) => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    fetch(`/api/board/${id}`, { method: "DELETE" })
      .then(() => {
        setSavedBoards(prev => prev.filter(b => b.id !== id));
        // If deleting the current board, switch to another or create new
        if (id === board.id) {
          fetch("/api/board").then(r => r.json()).then(list => {
            if (list?.length > 0) {
              loadBoard(list[0].id);
            } else {
              createNewBoard();
            }
          });
        }
      })
      .catch(() => {});
  }, [board.id, loadBoard, createNewBoard]);

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
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [editDesc, setEditDesc] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "gantt">("board");
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [focusPos, setFocusPos] = useState<{ listIdx: number; cardIdx: number } | null>(null);

  // Card drag state
  const dragCard = useRef<{ cardId: string; sourceListId: string } | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);

  // List drag state
  const dragListRef = useRef<string | null>(null);
  const [dragOverListIdx, setDragOverListIdx] = useState<number | null>(null);

  // Gantt drag state
  const ganttDrag = useRef<{
    cardId: string;
    mode: "move" | "resize-start" | "resize-end";
    startX: number;
    origLeft: number;
    origWidth: number;
    origStartDate: string;
    origDueDate: string;
    rangeStartTime: number;
    dayWidth: number;
    moved: boolean;
  } | null>(null);
  const [ganttDragPreview, setGanttDragPreview] = useState<{ cardId: string; left: number; width: number } | null>(null);

  // Refs
  const addListInputRef = useRef<HTMLInputElement>(null);
  const addCardInputRef = useRef<HTMLTextAreaElement>(null);

  // ===================== KEYBOARD NAVIGATION =====================

  // Clear focus when switching to gantt or when modal opens via click
  useEffect(() => {
    if (viewMode === "gantt") setFocusPos(null);
  }, [viewMode]);

  useEffect(() => {
    if (editingCard) setFocusPos(null);
  }, [editingCard]);

  useEffect(() => {
    if (!focusPos || viewMode !== "board") return;
    const selector = focusPos.cardIdx === -1
      ? `[data-list-idx="${focusPos.listIdx}"] .list-header`
      : `[data-list-idx="${focusPos.listIdx}"] [data-card-idx="${focusPos.cardIdx}"]`;
    const el = document.querySelector(selector);
    if (el) (el as HTMLElement).scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [focusPos, viewMode]);

  useEffect(() => {
    if (viewMode !== "board") return;
    const isModalOpen = !!editingCard || !!editingListId || !!addingCardListId || !!editingProjectName || showAddList;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;

      if (e.key === "Tab") {
        e.preventDefault();
        setFocusPos(prev => {
          const listCount = board.lists.length;
          if (listCount === 0) return null;
          if (!prev) return { listIdx: 0, cardIdx: -1 };
          const dir = e.shiftKey ? -1 : 1;
          const newListIdx = Math.max(0, Math.min(listCount - 1, prev.listIdx + dir));
          // Clamp cardIdx to valid range for new list
          const newList = board.lists[newListIdx];
          const visibleCount = newList ? getVisibleCardIds(newList.cardIds).length : 0;
          const newCardIdx = prev.cardIdx === -1 ? -1 : Math.min(prev.cardIdx, visibleCount - 1);
          return { listIdx: newListIdx, cardIdx: Math.max(-1, newCardIdx) };
        });
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        setFocusPos(prev => {
          const listCount = board.lists.length;
          if (listCount === 0) return null;
          if (!prev) return { listIdx: 0, cardIdx: -1 };
          const list = board.lists[prev.listIdx];
          if (!list) return prev;
          const visibleCards = getVisibleCardIds(list.cardIds);
          if (prev.cardIdx === -1) {
            // Move from list title to first card
            return visibleCards.length > 0 ? { ...prev, cardIdx: 0 } : prev;
          }
          if (prev.cardIdx < visibleCards.length - 1) {
            // Move to next card
            return { ...prev, cardIdx: prev.cardIdx + 1 };
          }
          // At last card — open modal
          const cardId = visibleCards[prev.cardIdx];
          const card = cardId ? board.cards[cardId] : null;
          if (card) {
            // Use setTimeout to avoid state conflict with setFocusPos
            setTimeout(() => setEditingCard(card), 0);
          }
          return prev;
        });
        return;
      }

      if (e.key === "Escape") {
        setFocusPos(null);
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, editingCard, editingListId, addingCardListId, editingProjectName, showAddList, board.lists, board.cards, hideCompleted]);

  // ===================== LIST ACTIONS =====================

  const addList = useCallback(() => {
    if (!addingListTitle.trim()) return;
    const id = "list-" + Date.now();
    setBoardAndSave(prev => ({
      ...prev,
      lists: [...prev.lists, { id, title: addingListTitle.trim(), cardIds: [] }],
    }));
    setAddingListTitle("");
  }, [addingListTitle, setBoardAndSave]);

  const renameList = useCallback((listId: string, title: string) => {
    setBoardAndSave(prev => ({
      ...prev,
      lists: prev.lists.map(l => l.id === listId ? { ...l, title } : l),
    }));
  }, [setBoardAndSave]);

  const deleteList = useCallback((listId: string) => {
    setBoardAndSave(prev => {
      const list = prev.lists.find(l => l.id === listId);
      const newCards = { ...prev.cards };
      list?.cardIds.forEach(id => delete newCards[id]);
      return { ...prev, lists: prev.lists.filter(l => l.id !== listId), cards: newCards };
    });
  }, [setBoardAndSave]);

  // ===================== CARD ACTIONS =====================

  const addCard = useCallback((listId: string) => {
    if (!addingCardTitle.trim()) return;
    const id = "card-" + Date.now();
    const card: Card = {
      id,
      title: addingCardTitle.trim(),
      description: "",
      labels: [],
      startDate: "",
      dueDate: "",
      completed: false,
      completedAt: "",
      createdAt: new Date().toISOString(),
    };
    setBoardAndSave(prev => ({
      ...prev,
      cards: { ...prev.cards, [id]: card },
      lists: prev.lists.map(l => l.id === listId ? { ...l, cardIds: [...l.cardIds, id] } : l),
    }));
    setAddingCardTitle("");
  }, [addingCardTitle, setBoardAndSave]);

  const updateCard = useCallback((card: Card) => {
    setBoardAndSave(prev => ({ ...prev, cards: { ...prev.cards, [card.id]: card } }));
    setEditingCard(card);
  }, [setBoardAndSave]);

  const toggleCard = useCallback((cardId: string) => {
    setBoardAndSave(prev => {
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
  }, [setBoardAndSave]);

  const deleteCard = useCallback((cardId: string) => {
    setBoardAndSave(prev => {
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
  }, [setBoardAndSave]);

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

    setBoardAndSave(prev => ({
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

  // ===================== LIST DRAG & DROP =====================

  const handleListDragStart = (e: React.DragEvent, listId: string) => {
    dragListRef.current = listId;
    e.dataTransfer.effectAllowed = "move";
    // Add a custom type so we can distinguish list drags from card drags
    e.dataTransfer.setData("text/x-list-id", listId);
  };

  const handleListDragOver = (e: React.DragEvent, idx: number) => {
    if (!dragListRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverListIdx(idx);
  };

  const handleListDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    setDragOverListIdx(null);
    if (!dragListRef.current) return;
    const sourceId = dragListRef.current;
    dragListRef.current = null;

    setBoardAndSave(prev => {
      const sourceIdx = prev.lists.findIndex(l => l.id === sourceId);
      if (sourceIdx === -1 || sourceIdx === targetIdx) return prev;
      const newLists = [...prev.lists];
      const [moved] = newLists.splice(sourceIdx, 1);
      // Adjust target index if source was before target
      const adjustedIdx = sourceIdx < targetIdx ? targetIdx - 1 : targetIdx;
      newLists.splice(adjustedIdx, 0, moved);
      return { ...prev, lists: newLists };
    });
  };

  const handleListDragEnd = () => {
    dragListRef.current = null;
    setDragOverListIdx(null);
  };

  // ===================== GANTT DRAG & DROP =====================

  const handleGanttMouseDown = useCallback((
    e: React.MouseEvent,
    cardId: string,
    mode: "move" | "resize-start" | "resize-end",
    barLeft: number,
    barWidth: number,
    startDate: string,
    dueDate: string,
    rangeStartTime: number,
    dayWidth: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    ganttDrag.current = {
      cardId, mode, startX: e.clientX,
      origLeft: barLeft, origWidth: barWidth,
      origStartDate: startDate, origDueDate: dueDate,
      rangeStartTime, dayWidth, moved: false,
    };
    setGanttDragPreview({ cardId, left: barLeft, width: barWidth });

    const onMouseMove = (ev: MouseEvent) => {
      const drag = ganttDrag.current;
      if (!drag) return;
      const dx = ev.clientX - drag.startX;
      if (Math.abs(dx) > 3) drag.moved = true;
      const minWidth = drag.dayWidth;

      if (drag.mode === "move") {
        setGanttDragPreview({ cardId: drag.cardId, left: drag.origLeft + dx, width: drag.origWidth });
      } else if (drag.mode === "resize-start") {
        const newLeft = drag.origLeft + dx;
        const newWidth = drag.origWidth - dx;
        if (newWidth >= minWidth) {
          setGanttDragPreview({ cardId: drag.cardId, left: newLeft, width: newWidth });
        }
      } else if (drag.mode === "resize-end") {
        const newWidth = drag.origWidth + dx;
        if (newWidth >= minWidth) {
          setGanttDragPreview({ cardId: drag.cardId, left: drag.origLeft, width: newWidth });
        }
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      const drag = ganttDrag.current;
      if (!drag || !drag.moved) {
        ganttDrag.current = null;
        setGanttDragPreview(null);
        return;
      }

      // Use setGanttDragPreview callback to read final preview values synchronously
      ganttDrag.current = null;
      setGanttDragPreview(prev => {
        if (!prev || prev.cardId !== drag.cardId) return null;

        const pixelToDate = (px: number): string => {
          const dayOffset = Math.round(px / drag.dayWidth);
          const d = new Date(drag.rangeStartTime);
          d.setDate(d.getDate() + dayOffset);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${dd}`;
        };

        const newStartDate = pixelToDate(prev.left);
        const endDayOffset = Math.round((prev.left + prev.width) / drag.dayWidth) - 1;
        const endD = new Date(drag.rangeStartTime);
        endD.setDate(endD.getDate() + endDayOffset);
        const ey = endD.getFullYear();
        const em = String(endD.getMonth() + 1).padStart(2, "0");
        const edd = String(endD.getDate()).padStart(2, "0");
        const newDueDate = `${ey}-${em}-${edd}`;

        // Apply update via setBoardAndSave
        setBoardAndSave(board => {
          const card = board.cards[drag.cardId];
          if (!card) return board;
          const updatedCard = { ...card };
          if (drag.mode === "move") {
            updatedCard.startDate = card.startDate ? newStartDate : "";
            updatedCard.dueDate = card.dueDate ? newDueDate : "";
            // If card only had one date, set both
            if (!card.startDate && card.dueDate) {
              updatedCard.dueDate = newStartDate; // single-day card moved
            }
            if (card.startDate && !card.dueDate) {
              updatedCard.startDate = newStartDate;
            }
            if (card.startDate && card.dueDate) {
              updatedCard.startDate = newStartDate;
              updatedCard.dueDate = newDueDate;
            }
          } else if (drag.mode === "resize-start") {
            updatedCard.startDate = newStartDate;
            if (!card.startDate) updatedCard.startDate = newStartDate;
          } else if (drag.mode === "resize-end") {
            updatedCard.dueDate = newDueDate;
            if (!card.dueDate) updatedCard.dueDate = newDueDate;
          }
          return { ...board, cards: { ...board.cards, [drag.cardId]: updatedCard } };
        });

        return null; // clear preview
      });
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [setBoardAndSave]);

  // ===================== LABEL ACTIONS =====================

  const renameLabel = useCallback((color: string, name: string) => {
    setBoardAndSave(prev => ({
      ...prev,
      labelNames: { ...prev.labelNames, [color]: name },
    }));
  }, [setBoardAndSave]);

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
          {editingProjectName ? (
            <input
              className="project-name-input"
              value={projectNameDraft}
              onChange={e => setProjectNameDraft(e.target.value)}
              onBlur={() => {
                if (projectNameDraft.trim()) setBoardAndSave(prev => ({ ...prev, name: projectNameDraft.trim() }));
                setEditingProjectName(false);
              }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  if (projectNameDraft.trim()) setBoardAndSave(prev => ({ ...prev, name: projectNameDraft.trim() }));
                  setEditingProjectName(false);
                }
                if (e.key === "Escape") setEditingProjectName(false);
              }}
              autoFocus
            />
          ) : (
            <h1
              className="project-name"
              onClick={() => { setEditingProjectName(true); setProjectNameDraft(board.name || "Task Board"); }}
            >
              {board.name || "Task Board"}
            </h1>
          )}
        </div>
        <div className="board-header-right">
          <button className="header-toggle-btn" onClick={createNewBoard}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
          <div style={{ position: "relative" }}>
            <button
              className="header-toggle-btn"
              onClick={() => { setShowBoardPicker(!showBoardPicker); if (!showBoardPicker) loadBoardList(); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Load
            </button>
            {showBoardPicker && (
              <div className="board-picker">
                <p className="board-picker-title">Saved Projects</p>
                {savedBoards.length === 0 && (
                  <p className="board-picker-empty">No saved projects yet</p>
                )}
                {savedBoards.map(b => (
                  <div key={b.id} className="board-picker-row">
                    <button
                      className={`board-picker-item ${b.id === board.id ? "board-picker-item-active" : ""}`}
                      onClick={() => loadBoard(b.id)}
                    >
                      {b.name || "Untitled"}
                    </button>
                    <button
                      className="board-picker-delete"
                      onClick={e => { e.stopPropagation(); deleteBoard(b.id); }}
                      title="Delete project"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button className="board-picker-new" onClick={createNewBoard}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  New project
                </button>
              </div>
            )}
          </div>
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === "board" ? "view-toggle-btn-active" : ""}`}
              onClick={() => setViewMode("board")}
              title="Board view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="7" height="18" rx="1.5" />
                <rect x="14" y="3" width="7" height="12" rx="1.5" />
              </svg>
              Board
            </button>
            <button
              className={`view-toggle-btn ${viewMode === "gantt" ? "view-toggle-btn-active" : ""}`}
              onClick={() => setViewMode("gantt")}
              title="Timeline view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M4 7h8M8 12h10M6 17h6" />
              </svg>
              Timeline
            </button>
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
        </div>
      </header>

      {/* Board / Gantt */}
      {viewMode === "gantt" ? (() => {
        // Parse "YYYY-MM-DD" as local midnight (avoids UTC offset issues)
        const parseLocal = (s: string) => {
          const [y, m, d] = s.split("-").map(Number);
          return new Date(y, m - 1, d);
        };
        const formatLocal = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        };

        // Collect all cards with date range, grouped by list
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = formatLocal(today);

        type GanttCard = Card & { listTitle: string };
        const ganttLists: { listId: string; listTitle: string; cards: GanttCard[] }[] = [];
        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        for (const list of board.lists) {
          const cards: GanttCard[] = [];
          for (const cardId of list.cardIds) {
            const card = board.cards[cardId];
            if (!card) continue;
            if (hideCompleted && card.completed) continue;
            // Need at least a start date or due date to show
            const start = card.startDate || card.dueDate;
            const end = card.dueDate || card.startDate;
            if (!start && !end) continue;
            cards.push({ ...card, listTitle: list.title });
            const sd = parseLocal(start);
            const ed = parseLocal(end);
            if (!minDate || sd < minDate) minDate = sd;
            if (!maxDate || ed > maxDate) maxDate = ed;
          }
          if (cards.length > 0) {
            ganttLists.push({ listId: list.id, listTitle: list.title, cards });
          }
        }

        // Add padding around date range
        if (!minDate || !maxDate) {
          // No cards with dates — show empty state
          return (
            <div className="gantt-empty">
              <p>No cards with dates to display.</p>
              <p>Add a start date and due date to cards to see them on the timeline.</p>
            </div>
          );
        }

        const rangeStart = new Date(minDate);
        rangeStart.setDate(rangeStart.getDate() - 3);
        const rangeEnd = new Date(maxDate);
        rangeEnd.setDate(rangeEnd.getDate() + 3);

        // Enforce minimum 30-day range
        const rangeDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
        if (rangeDays < 30) {
          const pad = Math.ceil((30 - rangeDays) / 2);
          rangeStart.setDate(rangeStart.getDate() - pad);
          rangeEnd.setDate(rangeEnd.getDate() + (30 - rangeDays - pad));
        }

        // Generate day columns
        const days: Date[] = [];
        const cur = new Date(rangeStart);
        while (cur <= rangeEnd) {
          days.push(new Date(cur));
          cur.setDate(cur.getDate() + 1);
        }

        const dayWidth = 40;
        const totalWidth = days.length * dayWidth;
        const labelWidth = 200;

        // Day difference using local dates (no timezone drift)
        const dayDiff = (a: Date, b: Date) =>
          Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

        const getBarLeft = (dateStr: string) => {
          return dayDiff(parseLocal(dateStr), rangeStart) * dayWidth;
        };

        const getBarWidth = (startStr: string, endStr: string) => {
          const diff = dayDiff(parseLocal(endStr), parseLocal(startStr));
          return Math.max((diff + 1) * dayWidth, dayWidth);
        };

        const todayLeft = dayDiff(today, rangeStart) * dayWidth;
        const showTodayLine = todayLeft >= 0 && todayLeft <= totalWidth;

        // Background grid CSS (repeating vertical lines every dayWidth)
        const gridBg = `repeating-linear-gradient(to right, #ecedf0 0px, #ecedf0 1px, transparent 1px, transparent ${dayWidth}px)`;
        const todayLineLeft = todayLeft + dayWidth / 2;

        return (
          <div className="gantt-container">
            <div className="gantt-scroll">
              {/* Header row — use absolute positioning for day cells (same as bars) */}
              <div className="gantt-header-row" style={{ width: labelWidth + totalWidth }}>
                <div className="gantt-label-col" style={{ width: labelWidth, minWidth: labelWidth }}>Task</div>
                <div className="gantt-timeline-header" style={{ width: totalWidth, minWidth: totalWidth, position: "relative", height: 48 }}>
                  {days.map((day, i) => {
                    const isToday = formatLocal(day) === todayStr;
                    const isFirstOfMonth = day.getDate() === 1;
                    return (
                      <div
                        key={i}
                        className={`gantt-day-header ${isToday ? "gantt-day-today" : ""} ${isFirstOfMonth ? "gantt-day-first-of-month" : ""}`}
                        style={{ position: "absolute", width: dayWidth, left: i * dayWidth, top: 0, bottom: 0 }}
                      >
                        {isFirstOfMonth && (
                          <span className="gantt-month-label">
                            {day.toLocaleDateString("en-US", { month: "short" })}
                          </span>
                        )}
                        <span className="gantt-day-num">{day.getDate()}</span>
                        <span className="gantt-day-name">
                          {day.toLocaleDateString("en-US", { weekday: "narrow" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Body */}
              <div className="gantt-body" style={{ width: labelWidth + totalWidth }}>
                {ganttLists.map(({ listId, listTitle, cards }) => (
                  <div key={listId} className="gantt-list-group">
                    <div className="gantt-list-header" style={{ width: labelWidth + totalWidth }}>
                      <span>{listTitle}</span>
                    </div>
                    {cards.map(card => {
                      const start = card.startDate || card.dueDate;
                      const end = card.dueDate || card.startDate;
                      const calcLeft = getBarLeft(start);
                      const calcWidth = getBarWidth(start, end);
                      const isDragging = ganttDragPreview?.cardId === card.id;
                      const barLeft = isDragging ? ganttDragPreview.left : calcLeft;
                      const barWidth = isDragging ? ganttDragPreview.width : calcWidth;
                      const isOverdue = !card.completed && card.dueDate && new Date(card.dueDate) < today;
                      const barClass = card.completed
                        ? "gantt-bar-done"
                        : isOverdue
                          ? "gantt-bar-overdue"
                          : "gantt-bar-active";
                      const rangeStartTime = rangeStart.getTime();

                      return (
                        <div key={card.id} className="gantt-row" style={{ width: labelWidth + totalWidth }}>
                          <div
                            className="gantt-row-label"
                            style={{ width: labelWidth, minWidth: labelWidth }}
                            title={card.title}
                            onClick={() => setEditingCard(board.cards[card.id])}
                          >
                            <span className={`gantt-row-checkbox ${card.completed ? "gantt-row-checkbox-done" : ""}`} />
                            <span className={`gantt-row-title ${card.completed ? "gantt-row-title-done" : ""}`}>
                              {card.title}
                            </span>
                          </div>
                          <div
                            className="gantt-row-bar-area"
                            style={{
                              width: totalWidth, minWidth: totalWidth,
                              position: "relative",
                              backgroundImage: gridBg, backgroundSize: `${totalWidth}px 100%`,
                            }}
                          >
                            {/* Today line inside bar area */}
                            {showTodayLine && (
                              <div className="gantt-today-line" style={{ left: todayLineLeft }} />
                            )}
                            <div
                              className={`gantt-bar ${barClass} ${isDragging ? "gantt-bar-dragging" : ""}`}
                              style={{ left: barLeft, width: barWidth }}
                              onClick={() => { if (!ganttDrag.current?.moved) setEditingCard(board.cards[card.id]); }}
                              title={`${card.title}\n${start} → ${end}`}
                              onMouseDown={e => handleGanttMouseDown(e, card.id, "move", calcLeft, calcWidth, start, end, rangeStartTime, dayWidth)}
                            >
                              <div
                                className="gantt-bar-handle gantt-bar-handle-left"
                                onMouseDown={e => { e.stopPropagation(); handleGanttMouseDown(e, card.id, "resize-start", calcLeft, calcWidth, start, end, rangeStartTime, dayWidth); }}
                              />
                              <div
                                className="gantt-bar-handle gantt-bar-handle-right"
                                onMouseDown={e => { e.stopPropagation(); handleGanttMouseDown(e, card.id, "resize-end", calcLeft, calcWidth, start, end, rangeStartTime, dayWidth); }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })() : (
      <div className="board-canvas">
        <div className="board-lists">
          {board.lists.map((list, idx) => {
            const visibleCards = getVisibleCardIds(list.cardIds);
            const isListFocused = focusPos?.listIdx === idx && focusPos?.cardIdx === -1;
            return (
            <div key={list.id} style={{ display: "flex", alignItems: "flex-start" }}>
              {/* Drop indicator before this list */}
              <div
                className={`list-drop-zone ${dragOverListIdx === idx ? "list-drop-zone-active" : ""}`}
                onDragOver={e => handleListDragOver(e, idx)}
                onDragLeave={() => setDragOverListIdx(null)}
                onDrop={e => handleListDrop(e, idx)}
              />
              <div
                data-list-idx={idx}
                className={`list-wrapper ${dragOverListId === list.id ? "list-drag-over" : ""} ${dragListRef.current === list.id ? "list-dragging" : ""}`}
                onDragOver={e => {
                  // Only handle card drag-over on the list body
                  if (!dragListRef.current) handleDragOver(e, list.id);
                }}
                onDragLeave={handleDragLeave}
                onDrop={e => {
                  if (!dragListRef.current) handleDrop(e, list.id);
                }}
              >
              {/* List header — draggable for list reordering */}
              <div
                className={`list-header ${isListFocused ? "kb-focused" : ""}`}
                draggable
                onDragStart={e => handleListDragStart(e, list.id)}
                onDragEnd={handleListDragEnd}
              >
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
                {visibleCards.map((cardId, cardIdx) => {
                  const card = board.cards[cardId];
                  if (!card) return null;
                  const isOverdue = !card.completed && card.dueDate && new Date(card.dueDate) < new Date(new Date().toDateString());
                  const isCardFocused = focusPos?.listIdx === idx && focusPos?.cardIdx === cardIdx;
                  return (
                    <div
                      key={card.id}
                      data-card-idx={cardIdx}
                      className={`card ${card.completed ? "card-completed" : ""} ${isOverdue ? "card-overdue" : ""} ${isCardFocused ? "kb-focused" : ""}`}
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
            </div>
            );
          })}

          {/* Drop indicator after last list */}
          {board.lists.length > 0 && (
            <div
              className={`list-drop-zone ${dragOverListIdx === board.lists.length ? "list-drop-zone-active" : ""}`}
              onDragOver={e => handleListDragOver(e, board.lists.length)}
              onDragLeave={() => setDragOverListIdx(null)}
              onDrop={e => handleListDrop(e, board.lists.length)}
            />
          )}

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
      )}

      {/* Card detail modal */}
      {editingCard && (() => {
        const parentList = getListForCard(editingCard.id);
        return (
          <div className="modal-overlay" onClick={() => { setEditingCard(null); setEditDesc(false); setShowLabelPicker(false); setShowDatePicker(false); setShowStartDatePicker(false); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => { setEditingCard(null); setEditDesc(false); setShowLabelPicker(false); setShowDatePicker(false); setShowStartDatePicker(false); }}>
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

                  {/* Start date */}
                  {editingCard.startDate && (
                    <div className="modal-section">
                      <h4 className="modal-label">Start date</h4>
                      <span className="modal-due">
                        {new Date(editingCard.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </span>
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

                    {/* Start Date */}
                    <div style={{ position: "relative" }}>
                      <button className="sidebar-btn" onClick={() => setShowStartDatePicker(!showStartDatePicker)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Start Date
                      </button>
                      {showStartDatePicker && (
                        <div className="date-picker">
                          <p className="date-picker-title">Start date</p>
                          <input
                            type="date"
                            className="date-picker-input"
                            value={editingCard.startDate}
                            onChange={e => updateCard({ ...editingCard, startDate: e.target.value })}
                            autoFocus
                          />
                          <div className="date-picker-actions">
                            <button className="btn-primary" onClick={() => setShowStartDatePicker(false)}>Save</button>
                            {editingCard.startDate && (
                              <button className="btn-text" onClick={() => { updateCard({ ...editingCard, startDate: "" }); setShowStartDatePicker(false); }}>Remove</button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Due Date */}
                    <div style={{ position: "relative" }}>
                      <button className="sidebar-btn" onClick={() => setShowDatePicker(!showDatePicker)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Due Date
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
