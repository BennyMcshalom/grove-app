/**
 * Database types — HAND-WRITTEN STAND-IN.
 *
 * Covers only the tables and functions the app calls so far. Once the Supabase
 * project is linked, replace this whole file with the generated version:
 *
 *   npm run db:types
 *
 * which covers every table in supabase/migrations.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Aura = "reflective" | "open_to_connect" | "deep_focus" | "in_transition" | "active_nearby";
type ThemePreference = "light" | "dark";
type LogVisibility = "circle" | "bonds" | "only_me";
type ChapterStatus = "open" | "closed";
type SubscriptionStatus = "none" | "trialing" | "active" | "past_due" | "canceled" | "expired";
type FocusDuration = "until_evening" | "until_tomorrow_morning" | "three_days" | "one_week";
type BondStatus = "pending" | "active" | "declined" | "released";
type ConnectionStatus = "pending" | "accepted" | "declined";
type PostKind = "root" | "grouv";
type PostProgress =
  | "just_started"
  | "in_progress"
  | "in_the_thick_of_it"
  | "almost_done"
  | "wrapping_up"
  | "starting_over";
type MediaKind = "photo" | "video";
type MessageKind = "text" | "voice" | "video" | "image" | "link" | "post_share" | "system";
type ReportTarget =
  | "post"
  | "comment"
  | "message"
  | "group"
  | "event"
  | "profile"
  | "truth"
  | "space_question";
type ReportReason = "spam" | "harassment" | "inappropriate" | "other";
type LogScope = "solo" | "bond";
type JoinPolicy = "open" | "approval";
type GroupRole = "admin" | "member";
type RequestStatus = "pending" | "approved" | "declined";
type EventStatus = "scheduled" | "cancelled";
type NotificationKind =
  | "connection_suggested"
  | "connection_request"
  | "connection_accepted"
  | "bond_invitation"
  | "bond_accepted"
  | "post_rooted"
  | "post_commented"
  | "group_join_request"
  | "group_join_reviewed"
  | "wave_received"
  | "chapter_prompt";

type ReadOnlyTable<Row> = { Row: Row; Insert: never; Update: never; Relationships: [] };

type ProfilesFk<Name extends string, Column extends string> = {
  foreignKeyName: Name;
  columns: [Column];
  isOneToOne: false;
  referencedRelation: "profiles";
  referencedColumns: ["id"];
};

type ConnectionRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ConnectionStatus;
  chapter_slug: string | null;
  created_at: string;
  responded_at: string | null;
};

type BondRow = {
  id: string;
  inviter_id: string;
  invitee_id: string;
  status: BondStatus;
  chapter_slug: string | null;
  depth: number;
  created_at: string;
  accepted_at: string | null;
  released_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string | null;
          kind: MessageKind;
          body: string | null;
          media_path: string | null;
          duration_seconds: number | null;
          link_url: string | null;
          link_title: string | null;
          link_description: string | null;
          shared_post_id: string | null;
          mentions: string[];
          created_at: string;
          edited_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          kind?: MessageKind;
          body?: string | null;
          media_path?: string | null;
          duration_seconds?: number | null;
          shared_post_id?: string | null;
        };
        Update: { body?: string | null; edited_at?: string | null; deleted_at?: string | null };
        Relationships: [
          {
            foreignKeyName: "messages_shared_post_id_fkey";
            columns: ["shared_post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          ProfilesFk<"messages_sender_id_fkey", "sender_id">,
        ];
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          user_id: string;
          joined_at: string;
          last_read_at: string | null;
        };
        Insert: never;
        Update: { last_read_at?: string | null };
        Relationships: [];
      };
      chapters: ReadOnlyTable<{
        slug: string;
        name: string;
        tagline: string;
        tint: string;
        icon: string;
        sort_order: number;
      }>;
      chapter_phases: ReadOnlyTable<{ chapter_slug: string; label: string; sort_order: number }>;
      profiles: {
        Row: {
          id: string;
          first_name: string;
          avatar_url: string | null;
          location_label: string | null;
          aura: Aura;
          theme: ThemePreference;
          log_visibility: LogVisibility;
          terms_accepted_at: string | null;
          onboarded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          first_name?: string;
          avatar_url?: string | null;
          location_label?: string | null;
          aura?: Aura;
          theme?: ThemePreference;
          log_visibility?: LogVisibility;
        };
        Relationships: [];
      };
      profile_prompts: {
        Row: {
          user_id: string;
          sitting_with: string | null;
          honest_tension: string | null;
          open_to: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          sitting_with?: string | null;
          honest_tension?: string | null;
          open_to?: string | null;
        };
        Update: {
          sitting_with?: string | null;
          honest_tension?: string | null;
          open_to?: string | null;
        };
        Relationships: [];
      };
      user_chapters: {
        Row: {
          id: string;
          user_id: string;
          chapter_slug: string;
          phase: string;
          status: ChapterStatus;
          opened_at: string;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; chapter_slug: string; phase: string };
        Update: { phase?: string };
        Relationships: [];
      };
      user_chapter_phases: {
        Row: { id: string; user_chapter_id: string; phase: string; started_at: string };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "user_chapter_phases_user_chapter_id_fkey";
            columns: ["user_chapter_id"];
            isOneToOne: false;
            referencedRelation: "user_chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      chapter_closures: {
        Row: {
          user_chapter_id: string;
          taught: string | null;
          advice: string | null;
          carrying_forward: string | null;
          reflections: string[];
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "chapter_closures_user_chapter_id_fkey";
            columns: ["user_chapter_id"];
            isOneToOne: true;
            referencedRelation: "user_chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          chapter_prompt: boolean;
          wave_received: boolean;
          bond_invitation: boolean;
          updated_at: string;
        };
        Insert: never;
        Update: { chapter_prompt?: boolean; wave_received?: boolean };
        Relationships: [];
      };
      subscriptions: ReadOnlyTable<{
        user_id: string;
        status: SubscriptionStatus;
        plan: string | null;
        trial_started_at: string | null;
        trial_ends_at: string | null;
        current_period_end: string | null;
        updated_at: string;
      }>;
      focus_sessions: {
        Row: {
          id: string;
          user_id: string;
          duration: FocusDuration;
          started_at: string;
          ends_at: string;
          ended_early_at: string | null;
        };
        Insert: { user_id: string; duration: FocusDuration; ends_at: string };
        Update: { ended_early_at?: string | null };
        Relationships: [];
      };
      bonds: {
        Row: BondRow;
        Insert: never;
        Update: never;
        Relationships: [
          ProfilesFk<"bonds_inviter_id_fkey", "inviter_id">,
          ProfilesFk<"bonds_invitee_id_fkey", "invitee_id">,
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          actor_id: string | null;
          entity_id: string | null;
          data: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: { read_at?: string | null };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string | null;
          chapter_slug: string;
          kind: PostKind;
          title: string | null;
          progress: PostProgress | null;
          body: string | null;
          is_anonymous: boolean;
          roots_count: number;
          comments_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          chapter_slug: string;
          kind?: PostKind;
          title?: string | null;
          progress?: PostProgress | null;
          body?: string | null;
          is_anonymous?: boolean;
        };
        Update: { title?: string | null; progress?: PostProgress | null; body?: string | null };
        Relationships: [];
      };
      post_media: {
        Row: {
          id: string;
          post_id: string;
          kind: MediaKind;
          storage_path: string;
          position: number;
          width: number | null;
          height: number | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          post_id: string;
          kind: MediaKind;
          storage_path: string;
          position?: number;
          width?: number | null;
          height?: number | null;
          duration_seconds?: number | null;
        };
        Update: never;
        Relationships: [];
      };
      post_roots: {
        Row: { post_id: string; user_id: string; created_at: string };
        Insert: { post_id: string; user_id: string };
        Update: never;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          body: string | null;
          media_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { post_id: string; author_id?: string; body?: string | null; media_path?: string | null };
        Update: { body?: string | null; media_path?: string | null };
        Relationships: [ProfilesFk<"comments_author_id_fkey", "author_id">];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: ReportTarget;
          target_id: string;
          reason: ReportReason;
          details: string | null;
          status: "open" | "reviewing" | "actioned" | "dismissed";
          created_at: string;
        };
        Insert: {
          target_type: ReportTarget;
          target_id: string;
          reason: ReportReason;
          details?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      space_questions: {
        Row: { id: string; chapter_slug: string; body: string; expires_at: string; created_at: string };
        Insert: { chapter_slug: string; body: string };
        Update: never;
        Relationships: [];
      };
      space_question_replies: {
        Row: {
          id: string;
          question_id: string;
          body: string | null;
          audio_path: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          question_id: string;
          body?: string | null;
          audio_path?: string | null;
          duration_seconds?: number | null;
        };
        Update: never;
        Relationships: [];
      };
      log_prompts: ReadOnlyTable<{
        id: string;
        chapter_slug: string | null;
        body: string;
        sort_order: number;
        active: boolean;
      }>;
      log_entries: {
        Row: {
          id: string;
          user_id: string;
          user_chapter_id: string;
          prompt_id: string | null;
          body: string | null;
          photo_path: string | null;
          entry_date: string;
          scope: LogScope;
          bond_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_chapter_id: string;
          prompt_id?: string | null;
          body?: string | null;
          photo_path?: string | null;
          entry_date?: string;
          scope?: LogScope;
          bond_id?: string | null;
        };
        Update: { body?: string | null; photo_path?: string | null };
        Relationships: [
          {
            foreignKeyName: "log_entries_user_chapter_id_fkey";
            columns: ["user_chapter_id"];
            isOneToOne: false;
            referencedRelation: "user_chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          id: string;
          slug: string;
          chapter_slug: string | null;
          title: string;
          label: string | null;
          description: string | null;
          icon: string;
          color: string;
          join_policy: JoinPolicy;
          created_by: string | null;
          conversation_id: string;
          member_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          label?: string | null;
          description?: string | null;
          icon?: string;
          color?: string;
          chapter_slug?: string | null;
        };
        Update: {
          title?: string;
          label?: string | null;
          description?: string | null;
          icon?: string;
          color?: string;
          join_policy?: JoinPolicy;
          chapter_slug?: string | null;
        };
        Relationships: [];
      };
      group_members: {
        Row: { group_id: string; user_id: string; role: GroupRole; joined_at: string };
        Insert: { group_id: string; user_id: string };
        Update: never;
        Relationships: [ProfilesFk<"group_members_user_id_fkey", "user_id">];
      };
      group_join_requests: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          status: RequestStatus;
          message: string | null;
          created_at: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
        };
        Insert: { group_id: string; message?: string | null };
        Update: never;
        Relationships: [ProfilesFk<"group_join_requests_user_id_fkey", "user_id">];
      };
      truths: {
        Row: { id: string; group_id: string; body: string; felt_count: number; created_at: string };
        Insert: { group_id: string; body: string };
        Update: never;
        Relationships: [];
      };
      truth_felt: {
        Row: { truth_id: string; user_id: string; created_at: string };
        Insert: { truth_id: string; user_id: string };
        Update: never;
        Relationships: [];
      };
      video_truths: {
        Row: {
          id: string;
          group_id: string;
          author_id: string;
          storage_path: string;
          thumbnail_path: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: { group_id: string; storage_path: string; duration_seconds?: number | null };
        Update: never;
        Relationships: [ProfilesFk<"video_truths_author_id_fkey", "author_id">];
      };
      events: {
        Row: {
          id: string;
          host_id: string | null;
          chapter_slug: string;
          title: string;
          icon: string;
          description: string | null;
          venue_name: string;
          venue_short: string | null;
          latitude: number | null;
          longitude: number | null;
          starts_at: string;
          capacity: number;
          going_count: number;
          status: EventStatus;
          conversation_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          chapter_slug: string;
          title: string;
          icon?: string;
          description?: string | null;
          venue_name: string;
          starts_at: string;
          capacity: number;
        };
        Update: { status?: EventStatus };
        Relationships: [];
      };
      event_attendees: {
        Row: { event_id: string; user_id: string; created_at: string };
        Insert: { event_id: string; user_id: string };
        Update: never;
        Relationships: [ProfilesFk<"event_attendees_user_id_fkey", "user_id">];
      };
      live_room_presence: {
        Row: { room_id: string; user_id: string; joined_at: string; seen_at: string };
        Insert: never;
        Update: { seen_at?: string };
        Relationships: [];
      };
      waves: {
        Row: { id: string; room_id: string; from_user: string; to_user: string; created_at: string };
        Insert: { room_id: string; to_user: string };
        Update: never;
        Relationships: [];
      };
      proximity_sessions: {
        Row: {
          user_id: string;
          latitude: number;
          longitude: number;
          started_at: string;
          expires_at: string;
        };
        Insert: { user_id: string; latitude: number; longitude: number; expires_at?: string };
        Update: { latitude?: number; longitude?: number; expires_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      bonds_overview: {
        Args: Record<string, never>;
        Returns: {
          user_id: string;
          first_name: string;
          avatar_url: string | null;
          aura: Aura;
          chapter_slug: string | null;
          phase: string | null;
          relationship: "bond" | "circle";
          bond_id: string | null;
          together_since: string;
          depth: number;
          conversation_id: string | null;
          last_message_body: string | null;
          last_message_kind: MessageKind | null;
          last_message_at: string | null;
          last_message_from_me: boolean | null;
          unread_count: number;
        }[];
      };
      pending_requests: {
        Args: Record<string, never>;
        Returns: {
          kind: "connection" | "bond";
          request_id: string;
          user_id: string;
          first_name: string;
          avatar_url: string | null;
          chapter_slug: string | null;
          phase: string | null;
          created_at: string;
        }[];
      };
      people_you_may_know: {
        Args: { p_limit?: number };
        Returns: {
          user_id: string;
          first_name: string;
          avatar_url: string | null;
          phase: string;
          shared_chapter: string;
          mutual_count: number;
          mutual_avatars: string[];
        }[];
      };
      open_direct_conversation: {
        Args: { p_other: string };
        Returns: string;
      };
      respond_to_connection: {
        Args: { p_connection_id: string; p_accept: boolean };
        Returns: ConnectionRow;
      };
      respond_to_bond: {
        Args: { p_bond_id: string; p_accept: boolean };
        Returns: BondRow;
      };
      complete_onboarding: {
        Args: {
          p_chapters: Json;
          p_sitting_with?: string | null;
          p_honest_tension?: string | null;
          p_open_to?: string | null;
        };
        Returns: undefined;
      };
      start_trial: {
        Args: Record<string, never>;
        Returns: Database["public"]["Tables"]["subscriptions"]["Row"];
      };
      close_chapter: {
        Args: {
          p_user_chapter_id: string;
          p_taught?: string | null;
          p_advice?: string | null;
          p_carrying_forward?: string | null;
          p_reflections?: string[];
        };
        Returns: undefined;
      };
      space_summaries: {
        Args: { p_slugs: string[] };
        Returns: { chapter_slug: string; member_count: number; member_avatars: string[] }[];
      };
      chapter_tallies: {
        Args: { p_user_chapter_id: string };
        Returns: { post_count: number; log_count: number }[];
      };
      feed_posts: {
        Args: {
          p_scope?: "all" | "roots" | "open" | "mine";
          p_chapter_slug?: string | null;
          p_from?: string | null;
          p_to?: string | null;
          p_before?: string | null;
          p_before_id?: string | null;
          p_limit?: number;
          p_post_id?: string | null;
        };
        Returns: {
          id: string;
          chapter_slug: string;
          kind: PostKind;
          title: string | null;
          progress: PostProgress | null;
          body: string | null;
          is_anonymous: boolean;
          roots_count: number;
          comments_count: number;
          created_at: string;
          author_id: string | null;
          author_name: string | null;
          author_avatar: string | null;
          author_phase: string | null;
          is_mine: boolean;
          rooted: boolean;
          media: { kind: MediaKind; path: string }[];
        }[];
      };
      space_members: {
        Args: { p_chapter_slug: string };
        Returns: {
          user_id: string;
          first_name: string;
          avatar_url: string | null;
          aura: Aura;
          phase: string;
          in_circle: boolean;
          connection_status: ConnectionStatus | null;
          connection_from_me: boolean | null;
          bond_status: BondStatus | null;
        }[];
      };
      live_space_questions: {
        Args: { p_chapter_slug: string };
        Returns: {
          id: string;
          body: string;
          expires_at: string;
          created_at: string;
          is_mine: boolean;
          reply_count: number;
        }[];
      };
      request_connection: {
        Args: { p_other: string; p_chapter_slug?: string | null };
        Returns: ConnectionRow;
      };
      invite_bond: {
        Args: { p_other: string; p_chapter_slug?: string | null };
        Returns: BondRow;
      };
      circle_logs: {
        Args: { p_scope?: "solo" | "bond"; p_limit?: number };
        Returns: {
          user_id: string;
          first_name: string;
          avatar_url: string | null;
          aura: Aura;
          chapter_slug: string;
          phase: string;
          latest_at: string;
          entries: {
            id: string;
            body: string | null;
            photo_path: string | null;
            entry_date: string;
            day_number: number;
            chapter_slug: string;
          }[];
        }[];
      };
      group_cards: {
        Args: { p_query?: string | null; p_slug?: string | null; p_suggested?: boolean; p_limit?: number };
        Returns: {
          id: string;
          slug: string;
          title: string;
          label: string | null;
          description: string | null;
          icon: string;
          color: string;
          chapter_slug: string | null;
          join_policy: JoinPolicy;
          member_count: number;
          conversation_id: string;
          created_at: string;
          my_role: GroupRole | null;
          request_pending: boolean;
          member_avatars: string[];
        }[];
      };
      group_truths: {
        Args: { p_group_id: string };
        Returns: {
          id: string;
          body: string;
          felt_count: number;
          created_at: string;
          felt_by_me: boolean;
          is_mine: boolean;
        }[];
      };
      review_join_request: {
        Args: { p_request_id: string; p_approve: boolean };
        Returns: Database["public"]["Tables"]["group_join_requests"]["Row"];
      };
      event_cards: {
        Args: { p_event_id?: string | null; p_query?: string | null; p_mine?: boolean; p_limit?: number };
        Returns: {
          id: string;
          title: string;
          icon: string;
          description: string | null;
          venue_name: string;
          venue_short: string | null;
          chapter_slug: string;
          starts_at: string;
          capacity: number;
          going_count: number;
          status: EventStatus;
          conversation_id: string;
          host_id: string | null;
          host_name: string | null;
          host_avatar: string | null;
          i_am_going: boolean;
          circle_going: number;
          circle_avatars: string[];
        }[];
      };
      start_live_room: {
        Args: { p_title: string; p_community_label?: string | null };
        Returns: string;
      };
      join_live_room: {
        Args: { p_room_id: string };
        Returns: undefined;
      };
      live_room_cards: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          title: string;
          community_label: string | null;
          venue_name: string | null;
          here_count: number;
          started_at: string;
          i_am_here: boolean;
        }[];
      };
      live_room_people: {
        Args: { p_room_id: string };
        Returns: {
          user_id: string;
          first_name: string;
          avatar_url: string | null;
          aura: Aura;
          chapter_slug: string | null;
          phase: string | null;
          is_me: boolean;
          i_waved: boolean;
          waved_at_me: boolean;
        }[];
      };
      my_notifications: {
        Args: { p_limit?: number };
        Returns: {
          id: string;
          kind: NotificationKind;
          actor_id: string | null;
          actor_name: string | null;
          actor_avatar: string | null;
          entity_id: string | null;
          data: Json;
          read_at: string | null;
          created_at: string;
          group_slug: string | null;
          group_title: string | null;
          room_title: string | null;
        }[];
      };
      question_replies: {
        Args: { p_question_id: string };
        Returns: {
          id: string;
          body: string | null;
          audio_path: string | null;
          duration_seconds: number | null;
          created_at: string;
          is_mine: boolean;
        }[];
      };
      search_everything: {
        Args: { p_query: string; p_limit?: number };
        Returns: {
          kind: "person" | "post" | "group" | "space";
          id: string;
          title: string;
          subtitle: string | null;
          image: string | null;
          chapter_slug: string | null;
        }[];
      };
      nearby_people: {
        Args: { p_radius_km?: number };
        Returns: {
          user_id: string;
          first_name: string;
          avatar_url: string | null;
          aura: Aura;
          chapter_slug: string;
          phase: string;
          distance_km: number;
        }[];
      };
    };
    Enums: {
      aura: Aura;
      theme_preference: ThemePreference;
      log_visibility: LogVisibility;
      chapter_status: ChapterStatus;
      subscription_status: SubscriptionStatus;
      focus_duration: FocusDuration;
      bond_status: BondStatus;
      connection_status: ConnectionStatus;
      post_kind: PostKind;
      post_progress: PostProgress;
      media_kind: MediaKind;
      report_reason: ReportReason;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
