import { supabase } from "@/integrations/supabase/client";

export interface AuditionSlot {
  id: string;
  project_id: string;
  caster_id: string;
  talent_id: string | null;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  meeting_link: string | null;
  notes: string | null;
  created_at: string;
  projects?: { title: string };
  profiles?: { name: string; photo_url: string; role: string };
}

export const auditionService = {
  async getProjectSlots(projectId: string) {
    const { data, error } = await supabase
      .from("audition_slots")
      .select(`
        *,
        profiles:talent_id (name, photo_url, role)
      `)
      .eq("project_id", projectId)
      .order("start_time", { ascending: true });
    
    if (error) throw error;
    return data as AuditionSlot[];
  },

  async createSlots(projectId: string, casterId: string, slots: { start_time: string, end_time: string }[]) {
    const payload = slots.map(s => ({
      project_id: projectId,
      caster_id: casterId,
      start_time: s.start_time,
      end_time: s.end_time,
      status: 'scheduled'
    }));

    const { data, error } = await supabase
      .from("audition_slots")
      .insert(payload)
      .select();
    
    if (error) throw error;
    return data;
  },

  async bookSlot(slotId: string, talentId: string) {
    const { data, error } = await supabase
      .from("audition_slots")
      .update({ talent_id: talentId })
      .eq("id", slotId)
      .is("talent_id", null) // Ensure it's not already booked
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async cancelBooking(slotId: string) {
    const { error } = await supabase
      .from("audition_slots")
      .update({ talent_id: null })
      .eq("id", slotId);
    
    if (error) throw error;
  },

  async deleteSlot(slotId: string) {
    const { error } = await supabase
      .from("audition_slots")
      .delete()
      .eq("id", slotId);
    
    if (error) throw error;
  }
};
