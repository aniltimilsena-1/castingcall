import { useState, useEffect, useCallback } from "react";
import { moodBoardService, MoodBoard, MoodBoardItem } from "@/services/moodBoardService";
import { motion, AnimatePresence } from "framer-motion";
import { FolderPlus, Trash2, Edit2, Users, Layout, Plus, X, FolderOpen, MoreHorizontal, Zap } from "lucide-react";
import { toast } from "sonner";

interface MoodBoardSectionProps {
  userId: string;
  onViewTalent: (talent: any) => void;
}

export default function MoodBoardSection({ userId, onViewTalent }: MoodBoardSectionProps) {
  const [boards, setBoards] = useState<MoodBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<MoodBoard | null>(null);
  const [boardItems, setBoardItems] = useState<MoodBoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await moodBoardService.getMyBoards(userId);
      setBoards(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchItems = useCallback(async (boardId: string) => {
    setItemsLoading(true);
    try {
      const data = await moodBoardService.getBoardItems(boardId);
      setBoardItems(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load items");
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    if (selectedBoard) {
      fetchItems(selectedBoard.id);
    }
  }, [selectedBoard, fetchItems]);

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return;
    try {
      const board = await moodBoardService.createBoard(userId, newBoardTitle, newBoardDesc);
      setBoards(prev => [board, ...prev]);
      setShowCreateModal(false);
      setNewBoardTitle("");
      setNewBoardDesc("");
      toast.success("Collection created!", { icon: "📂" });
    } catch (err: any) {
      toast.error(err.message || "Failed to create board");
    }
  };

  const handleDeleteBoard = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await moodBoardService.deleteBoard(id);
      setBoards(prev => prev.filter(b => b.id !== id));
      if (selectedBoard?.id === id) setSelectedBoard(null);
      toast.success("Collection deleted");
    } catch (err: any) {
      toast.error("Delete failed");
    }
  };

  const removeItem = async (talentId: string) => {
    if (!selectedBoard) return;
    try {
      await moodBoardService.removeItemFromBoard(selectedBoard.id, talentId);
      setBoardItems(prev => prev.filter(item => item.talent_id !== talentId));
      toast.success("Removed from collection");
    } catch (err: any) {
      toast.error("Failed to remove item");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 opacity-50">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display text-foreground flex items-center gap-3">
          <Layout className="text-primary w-5 h-5" /> 
          {selectedBoard ? selectedBoard.title : "Mood Board Collections"}
        </h2>
        {selectedBoard ? (
          <button onClick={() => setSelectedBoard(null)} className="text-sm text-primary hover:underline font-bold uppercase tracking-widest flex items-center gap-2">
            <X size={14} /> Back to collections
          </button>
        ) : (
          <button onClick={() => setShowCreateModal(true)} className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all transition-all flex items-center gap-2">
            <FolderPlus size={14} /> New Collection
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!selectedBoard ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
          >
            {boards.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-secondary/5 border-2 border-dashed border-border rounded-[2.5rem] opacity-40">
                <FolderOpen className="w-16 h-16 mx-auto mb-6 text-muted-foreground/30" />
                <p className="text-foreground">Organize your talent prospects</p>
                <p className="text-xs text-muted-foreground font-body">Create your first mood board to keep track of casting options.</p>
              </div>
            ) : (
              boards.map(board => (
                <div 
                  key={board.id} 
                  onClick={() => setSelectedBoard(board)}
                  className="group bg-card border border-border rounded-[2.5rem] p-8 flex flex-col h-48 cursor-pointer hover:border-primary transition-all hover:bg-primary/5 shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleDeleteBoard(e, board.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                      <Layout size={24} />
                    </div>
                    <h3 className="text-lg font-display text-foreground group-hover:text-primary transition-colors">{board.title}</h3>
                    <p className="text-xs text-muted-foreground font-body line-clamp-2 mt-2 leading-relaxed">{board.description || "No description provided."}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-[2px] font-bold">Open Mood Board</span>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {itemsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : boardItems.length === 0 ? (
              <div className="py-20 text-center bg-secondary/5 border border-dashed border-border rounded-[2.5rem]">
                <Users size={48} className="mx-auto mb-4 text-muted-foreground/20" />
                <h4 className="text-white/40">No talent in this collection yet</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-2">Go to Search or your Saved Talents to add people to {selectedBoard.title}.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {boardItems.map(item => (
                  <div key={item.id} className="stitched-card bg-card p-4 rounded-3xl flex items-center gap-4 group hover:border-amber-500/50 transition-all shadow-sm relative overflow-hidden">
                    <div className="stitched-card-scanner" />
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-secondary border border-border flex-shrink-0 cursor-pointer" onClick={() => onViewTalent(item.profiles)}>
                      {item.profiles?.photo_url ? (
                        <img src={item.profiles.photo_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary/50">
                          {item.profiles?.name[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onViewTalent(item.profiles)}>
                      <h3 className="font-bold text-foreground truncate">{item.profiles?.name}</h3>
                      <p className="text-xs text-primary font-bold uppercase tracking-widest">{item.profiles?.role || "Talent"}</p>
                      {item.notes && <p className="text-[10px] text-muted-foreground line-clamp-1 italic mt-1 font-body">"{item.notes}"</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                       <button 
                        onClick={() => removeItem(item.talent_id)}
                        className="p-3 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                        title="Remove from board"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE MODAL Overlay */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-[#111111] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="stitched-card-scanner" />
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-display text-primary uppercase tracking-[2px]">New Mood Board</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40"><X size={24} /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary tracking-[3px] uppercase ml-1">Board Title</label>
                  <input 
                    autoFocus
                    value={newBoardTitle}
                    onChange={e => setNewBoardTitle(e.target.value)}
                    placeholder="e.g. Lead Antagonist Options"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-foreground outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary tracking-[3px] uppercase ml-1">Description (Optional)</label>
                  <textarea 
                    value={newBoardDesc}
                    onChange={e => setNewBoardDesc(e.target.value)}
                    placeholder="Brief objective for this board..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-foreground outline-none focus:border-primary transition-all resize-none font-body"
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-muted-foreground hover:text-white transition-colors uppercase text-[10px] tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateBoard}
                    disabled={!newBoardTitle.trim()}
                    className="flex-1 bg-primary text-primary-foreground py-4 rounded-2xl font-bold uppercase text-[10px] tracking-[3px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                  >
                    Create Board
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
