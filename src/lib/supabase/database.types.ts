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
type LogVisibility = "circle" | "bonds" | "only_me" | "everyone";
type ChapterStatus = "open" | "closed";
type SubscriptionStatus = "none" | "trialing" | "active" | "past_due" | "canceled" | "expired";
type FocusDuration = "until_evening" | "until_tomorrow_morning" | "three_days" | "one_week";
type BondStatus = "pending" | "active" | "declined" | "released";
type BondOrigin = "engine" | "invite";
type CheckinMode = "in_app" | "in_person";
type BondActivityKind = "weekly" | "gratitude" | "something_new";
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
type MessageKind = "text" | "voice" | "video" | "image" | "link" | "post_share" | "system" | "card" | "file";
type CardKind = "curio" | "wander";
type ProximityMode = "open" | "stage_only";
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
type CallKind = "audio" | "video";
type CallStatus = "ringing" | "active" | "ended" | "missed" | "declined";
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
  | "bond_declined"
  | "bond_released"
  | "bond_log_shared"
  | "post_rooted"
  | "post_commented"
  | "group_join_request"
  | "group_join_reviewed"
  | "wave_received"
  | "chapter_prompt"
  | "bond_formed"
  | "bond_shifted"
  | "bond_chapter_opened"
  | "stage_drift"
  | "dormancy_nudge"
  | "chapter_closing_suggested"
  | "introduction_suggested"
  | "introduction_received"
  | "trial_ending"
  | "spaces_paused"
  | "referral_joined"
  | "referral_reward_earned"
  | "referral_nudge"
  | "report_reviewed"
  | "wrapped_ready"
  | "introduction_request"
  | "introduction_accepted"
  | "introduction_declined"
  | "match_available"
  | "chapter_invite"
  | "chapter_invite_accepted"
  | "companion_invite"
  | "companion_accepted"
  | "companion_update"
  | "companion_checkin"
  | "mentioned"
  | "event_cancelled";
/** A chapter invitation recipient's answer. */
type InviteResponse = "pending" | "accepted" | "declined";
/** Who a post is for (composer "Visible to"). */
type Audience = "everyone" | "selected_bonds" | "only_me";
type WrapRange = "week" | "month" | "chapter";
type ReferralStatus = "joined" | "qualified" | "applied";

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
  intro_message: string | null;
  intro_prompt: string | null;
  intro_seen_at: string | null;
};

type BondRow = {
  id: string;
  inviter_id: string;
  invitee_id: string;
  status: BondStatus;
  chapter_slug: string | null;
  created_at: string;
  accepted_at: string | null;
  released_at: string | null;
  origin: BondOrigin;
  shared_goal: string | null;
  goal_horizon_months: number | null;
  ended_by: string | null;
  responded_at: string | null;
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
          card_id: string | null;
          file_name: string | null;
          file_size: number | null;
          reply_to_id: string | null;
          deleted_by: string | null;
          pinned_at: string | null;
          pinned_by: string | null;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          kind?: MessageKind;
          card_id?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          reply_to_id?: string | null;
          body?: string | null;
          media_path?: string | null;
          duration_seconds?: number | null;
          shared_post_id?: string | null;
          mentions?: string[];
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
          {
            foreignKeyName: "messages_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "content_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey";
            columns: ["reply_to_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          user_id: string;
          joined_at: string;
          last_read_at: string | null;
          muted: boolean;
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
          username: string | null;
          banner: string | null;
        };
        Insert: never;
        Update: {
          first_name?: string;
          avatar_url?: string | null;
          location_label?: string | null;
          aura?: Aura;
          theme?: ThemePreference;
          log_visibility?: LogVisibility;
          username?: string | null;
          banner?: string | null;
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
          is_primary: boolean;
          /** Season Pass ended with more than four open: held but read-only. */
          paused_at: string | null;
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
          email_updates: boolean;
          timezone: string;
          updated_at: string;
        };
        Insert: never;
        Update: { chapter_prompt?: boolean; wave_received?: boolean; email_updates?: boolean };
        Relationships: [];
      };
      subscriptions: ReadOnlyTable<{
        user_id: string;
        status: SubscriptionStatus;
        plan: string | null;
        trial_started_at: string | null;
        trial_ends_at: string | null;
        current_period_end: string | null;
        billing_store: string | null;
        management_url: string | null;
        billing_synced_at: string | null;
        cancel_at_period_end: boolean;
        /** Season Pass granted outside billing (referral rewards). */
        bonus_until: string | null;
        spaces_review_due: boolean;
        trial_reminded_at: string | null;
        /** Free's four were locked in (chosen, or the default at expiry). */
        spaces_locked_at: string | null;
        locked_space_ids: string[] | null;
        updated_at: string;
      }>;
      referral_codes: ReadOnlyTable<{ user_id: string; code: string; created_at: string }>;
      referrals: ReadOnlyTable<{
        id: string;
        referrer_id: string;
        invitee_id: string;
        status: ReferralStatus;
        joined_at: string;
        qualified_at: string | null;
        applied_at: string | null;
        nudged_at: string | null;
      }>;
      calls: ReadOnlyTable<{
        id: string;
        conversation_id: string;
        caller_id: string | null;
        kind: CallKind;
        status: CallStatus;
        created_at: string;
        answered_at: string | null;
        ended_at: string | null;
      }>;
      focus_sessions: {
        Row: {
          id: string;
          user_id: string;
          duration: FocusDuration;
          started_at: string;
          ends_at: string;
          ended_early_at: string | null;
          digest_seen_at: string | null;
        };
        Insert: { user_id: string; duration: FocusDuration; ends_at: string };
        Update: { ended_early_at?: string | null; digest_seen_at?: string | null };
        Relationships: [];
      };
      profile_details: {
        Row: {
          user_id: string;
          bio: string | null;
          birthday: string | null;
          bio_audience: LogVisibility;
          location_audience: LogVisibility;
          chapter_audience: LogVisibility;
          birthday_audience: LogVisibility;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          bio?: string | null;
          birthday?: string | null;
          bio_audience?: LogVisibility;
          location_audience?: LogVisibility;
          chapter_audience?: LogVisibility;
          birthday_audience?: LogVisibility;
          updated_at?: string;
        };
        Update: {
          bio?: string | null;
          birthday?: string | null;
          bio_audience?: LogVisibility;
          location_audience?: LogVisibility;
          chapter_audience?: LogVisibility;
          birthday_audience?: LogVisibility;
          updated_at?: string;
        };
        Relationships: [];
      };
      account_deletions: {
        Row: { user_id: string; requested_at: string; delete_after: string };
        Insert: { user_id: string; requested_at?: string; delete_after: string };
        Update: { delete_after?: string };
        Relationships: [];
      };
      privacy_settings: {
        Row: { user_id: string; discoverable: boolean; activity_matching: boolean; updated_at: string };
        Insert: { user_id: string; discoverable?: boolean; activity_matching?: boolean };
        Update: { discoverable?: boolean; activity_matching?: boolean };
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
      bond_checkins: ReadOnlyTable<{
        id: string;
        bond_id: string;
        author_id: string;
        mode: CheckinMode;
        body: string;
        happened_on: string;
        created_at: string;
      }>;
      connections: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: ConnectionStatus;
          chapter_slug: string | null;
          created_at: string;
          responded_at: string | null;
          intro_message: string | null;
          intro_prompt: string | null;
          intro_seen_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
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
          emailed_at: string | null;
          email_sent: boolean;
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
          open_grove: boolean;
          audience: Audience;
          roots_count: number;
          comments_count: number;
          mentions: string[];
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
          open_grove?: boolean;
          audience?: Audience;
        };
        Update: { title?: string | null; progress?: PostProgress | null; body?: string | null };
        Relationships: [];
      };
      post_audience: {
        Row: { post_id: string; user_id: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      match_preferences: ReadOnlyTable<{
        user_id: string;
        life_stages: string[];
        looking_for: string[];
        distance_km: number | null;
        notify_new_matches: boolean;
        last_match_notified_at: string | null;
        updated_at: string;
      }>;
      match_dismissals: ReadOnlyTable<{ user_id: string; other_id: string; created_at: string }>;
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
          /** Seconds; a clip plays from trim_start to trim_end. */
          trim_start: number | null;
          trim_end: number | null;
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
          trim_start?: number | null;
          trim_end?: number | null;
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
          parent_id: string | null;
          roots_count: number;
          mentions: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          post_id: string;
          author_id?: string;
          body?: string | null;
          media_path?: string | null;
          parent_id?: string | null;
          mentions?: string[];
        };
        Update: { body?: string | null; media_path?: string | null };
        Relationships: [ProfilesFk<"comments_author_id_fkey", "author_id">];
      };
      comment_roots: {
        Row: { comment_id: string; user_id: string; created_at: string };
        Insert: { comment_id: string; user_id: string };
        Update: never;
        Relationships: [];
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
          reviewed_by: string | null;
          reviewed_at: string | null;
          resolution_note: string | null;
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
      staff: {
        Row: { user_id: string; added_at: string };
        Insert: never;
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
          visibility: LogVisibility | null;
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
        Update: { body?: string | null; photo_path?: string | null; visibility?: LogVisibility | null };
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
          art: string;
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
          art?: string;
          chapter_slug?: string | null;
        };
        Update: {
          title?: string;
          label?: string | null;
          description?: string | null;
          icon?: string;
          color?: string;
          art?: string;
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
          requester_seen_at: string | null;
        };
        Insert: { group_id: string; message?: string | null };
        Update: never;
        Relationships: [ProfilesFk<"group_join_requests_user_id_fkey", "user_id">];
      };
      chapter_invites: ReadOnlyTable<{
        id: string;
        sender_id: string;
        user_chapter_id: string;
        chapter_slug: string;
        title: string;
        note: string | null;
        photo_paths: string[];
        token: string;
        created_at: string;
        revoked_at: string | null;
        recipient_id: string | null;
        ask: string | null;
        share_story: boolean;
        share_current: boolean;
        share_future: boolean;
      }>;
      chapter_invite_recipients: ReadOnlyTable<{
        invite_id: string;
        recipient_id: string;
        status: InviteResponse;
        created_at: string;
        responded_at: string | null;
      }>;
      chapter_invite_moments: ReadOnlyTable<{
        invite_id: string;
        log_entry_id: string | null;
        post_id: string | null;
        position: number;
      }>;
      companion_chapter_notes: ReadOnlyTable<{
        user_chapter_id: string;
        owner_id: string;
        where_now: string | null;
        milestone: string | null;
        milestone_date: string | null;
        updated_at: string;
      }>;
      chapter_companions: ReadOnlyTable<{
        id: string;
        invite_id: string;
        user_chapter_id: string;
        owner_id: string;
        companion_id: string;
        created_at: string;
        muted_at: string | null;
        ended_at: string | null;
        ended_by: string | null;
      }>;
      companion_updates: ReadOnlyTable<{
        id: string;
        user_chapter_id: string;
        owner_id: string;
        body: string | null;
        photo_path: string | null;
        created_at: string;
      }>;
      companion_update_recipients: ReadOnlyTable<{ update_id: string; companion_id: string }>;
      companion_messages: ReadOnlyTable<{
        id: string;
        companion_id: string;
        author_id: string;
        body: string;
        created_at: string;
      }>;
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
          latitude?: number | null;
          longitude?: number | null;
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
        Row: { id: string; room_id: string | null; from_user: string; to_user: string; created_at: string };
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
          mode: ProximityMode;
        };
        Insert: { user_id: string; latitude: number; longitude: number; expires_at?: string; mode?: ProximityMode };
        Update: { latitude?: number; longitude?: number; expires_at?: string; mode?: ProximityMode };
        Relationships: [];
      };
      bond_ranks: ReadOnlyTable<{ user_id: string; bond_id: string; rank: number }>;
      blocks: ReadOnlyTable<{ blocker_id: string; blocked_id: string; created_at: string }>;
      introductions: ReadOnlyTable<{
        id: string;
        introducer_id: string;
        user_a: string;
        user_b: string;
        note: string | null;
        created_at: string;
        credited_at: string | null;
      }>;
      content_cards: ReadOnlyTable<{
        id: string;
        kind: CardKind;
        chapter_slug: string | null;
        topic_cluster: string;
        title: string;
        body: string;
        active: boolean;
        created_at: string;
      }>;
      user_daily_curio: ReadOnlyTable<{
        id: string;
        user_id: string;
        card_id: string;
        kind: CardKind;
        chapter_slug: string | null;
        served_on: string;
        expires_at: string;
      }>;
      wraps: ReadOnlyTable<{
        id: string;
        user_id: string;
        range: WrapRange;
        user_chapter_id: string | null;
        source_chapter_ids: string[];
        starts_on: string;
        ends_on: string;
        title: string;
        created_at: string;
      }>;
      wrap_moments: {
        Row: {
          id: string;
          wrap_id: string;
          position: number;
          log_entry_id: string | null;
          body: string | null;
          photo_path: string | null;
          moment_date: string;
          edited_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "wrap_moments_wrap_id_fkey";
            columns: ["wrap_id"];
            isOneToOne: false;
            referencedRelation: "wraps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wrap_moments_log_entry_id_fkey";
            columns: ["log_entry_id"];
            isOneToOne: false;
            referencedRelation: "log_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      wrap_shares: ReadOnlyTable<{
        id: string;
        token: string;
        user_id: string;
        wrap_id: string;
        moment_id: string | null;
        sharer_name: string | null;
        range: WrapRange;
        starts_on: string;
        ends_on: string;
        body: string | null;
        photo_path: string | null;
        moment_date: string;
        hide_names: boolean;
        hide_photos: boolean;
        created_at: string;
        revoked_at: string | null;
      }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      generate_wrap: {
        Args: {
          p_range: WrapRange;
          p_source_chapter_ids?: string[];
          p_user_chapter_id?: string | null;
          p_today?: string | null;
        };
        Returns: string;
      };
      update_wrap_moment: {
        Args: { p_moment_id: string; p_body: string; p_update_source?: boolean };
        Returns: boolean;
      };
      create_wrap_share: {
        Args: { p_moment_id: string; p_hide_names?: boolean; p_hide_photos?: boolean };
        Returns: { id: string; token: string }[];
      };
      revoke_wrap_share: { Args: { p_share_id: string }; Returns: undefined };
      wrap_share_preview: { Args: { p_moment_id: string; p_hide_names?: boolean }; Returns: string | null };
      shared_wrap_card: {
        Args: { p_token: string };
        Returns: {
          sharer_name: string | null;
          range: WrapRange;
          starts_on: string;
          ends_on: string;
          body: string | null;
          photo_path: string | null;
          moment_date: string;
        }[];
      };
      reopen_chapter: { Args: { p_user_chapter_id: string }; Returns: undefined };
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
          bond_rank: number | null;
          bond_origin: BondOrigin | null;
          shared_goal: string | null;
          goal_horizon_months: number | null;
          checkin_count: number;
          depth_level: number | null;
          invite_id: string | null;
          invite_from_me: boolean | null;
          invite_goal: string | null;
          conversation_id: string | null;
          last_message_body: string | null;
          last_message_kind: MessageKind | null;
          last_message_at: string | null;
          last_message_from_me: boolean | null;
          unread_count: number;
        }[];
      };
      invite_to_bond: { Args: { p_other: string; p_goal: string }; Returns: string };
      respond_to_bond_invite: { Args: { p_bond_id: string; p_accept: boolean }; Returns: undefined };
      withdraw_bond_invite: { Args: { p_bond_id: string }; Returns: undefined };
      end_bond: { Args: { p_bond_id: string }; Returns: undefined };
      set_bond_goal: {
        Args: { p_bond_id: string; p_goal: string; p_horizon_months?: number | null };
        Returns: undefined;
      };
      log_bond_checkin: {
        Args: { p_bond_id: string; p_mode: CheckinMode; p_body: string; p_happened_on?: string };
        Returns: string;
      };
      start_bond_activity: { Args: { p_bond_id: string; p_kind: BondActivityKind }; Returns: string };
      end_bond_activity: { Args: { p_activity_id: string }; Returns: undefined };
      save_bond_response: {
        Args: { p_activity_id: string; p_round: number; p_body: string; p_share: boolean; p_photo_path?: string | null; p_title?: string | null };
        Returns: undefined;
      };
      bond_log: {
        Args: { p_bond_id: string };
        Returns: {
          activity_id: string;
          kind: BondActivityKind;
          activity_started_at: string;
          activity_ended: boolean;
          round: number;
          opens_on: string;
          title: string | null;
          subtitle: string | null;
          my_body: string | null;
          my_shared: boolean;
          their_body: string | null;
          their_shared: boolean;
          my_photo_path: string | null;
          their_photo_path: string | null;
          my_saved: boolean;
          my_title: string | null;
          their_title: string | null;
        }[];
      };
      my_bond_logs: {
        Args: Record<string, never>;
        Returns: {
          bond_id: string;
          user_id: string;
          first_name: string;
          avatar_url: string | null;
          chapter_slug: string | null;
          phase: string | null;
          status: BondStatus;
          since: string;
          released_at: string | null;
          shared_count: number;
          waiting_on_me: boolean;
        }[];
      };
      bond_invites: {
        Args: Record<string, never>;
        Returns: {
          bond_id: string;
          user_id: string;
          first_name: string;
          avatar_url: string | null;
          chapter_slug: string | null;
          phase: string | null;
          shared_goal: string | null;
          created_at: string;
        }[];
      };
      bond_details: {
        Args: { p_bond_id: string };
        Returns: {
          bond_id: string;
          user_id: string;
          first_name: string;
          avatar_url: string | null;
          aura: Aura;
          chapter_slug: string | null;
          phase: string | null;
          origin: BondOrigin;
          status: BondStatus;
          shared_goal: string | null;
          goal_horizon_months: number | null;
          since: string;
          released_at: string | null;
          ended_by_me: boolean | null;
          depth_level: number | null;
          checkin_count: number;
          first_checkin_on: string | null;
          log_count: number;
        }[];
      };
      pending_requests: {
        Args: Record<string, never>;
        Returns: {
          kind: "connection";
          request_id: string;
          user_id: string;
          first_name: string;
          avatar_url: string | null;
          chapter_slug: string | null;
          phase: string | null;
          created_at: string;
          message: string | null;
          prompt: string | null;
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
      introduce_yourself: {
        Args: { p_other: string; p_message: string; p_prompt?: string | null; p_chapter_slug?: string | null };
        Returns: ConnectionRow;
      };
      my_introductions: {
        Args: { p_limit?: number };
        Returns: {
          connection_id: string;
          direction: "sent" | "received";
          other_id: string;
          first_name: string;
          avatar_url: string | null;
          status: ConnectionStatus;
          message: string | null;
          prompt: string | null;
          chapter_slug: string | null;
          phase: string | null;
          seen_at: string | null;
          created_at: string;
          responded_at: string | null;
        }[];
      };
      mark_introductions_seen: { Args: Record<string, never>; Returns: number };
      potential_matches: {
        Args: { p_limit?: number };
        Returns: {
          user_id: string;
          first_name: string;
          avatar_url: string | null;
          chapter_slug: string;
          phase: string;
          same_phase: boolean;
          looking_for: string[];
          shared_looking_for: string[];
          shared_life_stages: string[];
        }[];
      };
      dismiss_match: { Args: { p_other: string }; Returns: undefined };
      save_match_preferences: {
        Args: { p_life_stages: string[]; p_looking_for: string[]; p_distance_km: number | null; p_notify: boolean };
        Returns: {
          user_id: string;
          life_stages: string[];
          looking_for: string[];
          distance_km: number | null;
          notify_new_matches: boolean;
          last_match_notified_at: string | null;
          updated_at: string;
        };
      };
      set_post_audience: { Args: { p_post_id: string; p_user_ids: string[] }; Returns: number };
      set_post_mentions: { Args: { p_post_id: string; p_user_ids: string[] }; Returns: string[] };
      mention_candidates: {
        Args: { p_query?: string; p_post_id?: string | null; p_chapter_slug?: string | null; p_conversation_id?: string | null };
        Returns: { user_id: string; first_name: string; avatar_url: string | null; aura: Aura; is_close: boolean }[];
      };
      profile_for: {
        Args: { p_user_id: string };
        Returns: { bio: string | null; birthday: string | null; location_label: string | null; show_chapter: boolean }[];
      };
      request_account_deletion: { Args: Record<string, never>; Returns: string };
      cancel_account_deletion: { Args: Record<string, never>; Returns: boolean };
      grouv_people: {
        Args: { p_user_id: string };
        Returns: { user_id: string; first_name: string; avatar_url: string | null; aura: Aura; relationship: "bond" | "circle" }[];
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
      has_pass: { Args: Record<string, never>; Returns: boolean };
      create_companion_invite: {
        Args: {
          p_user_chapter_id: string;
          p_title: string;
          p_why?: string | null;
          p_ask?: string | null;
          p_where_now?: string | null;
          p_milestone?: string | null;
          p_milestone_date?: string | null;
          p_share_story?: boolean;
          p_share_current?: boolean;
          p_share_future?: boolean;
          p_log_entry_ids?: string[];
          p_post_ids?: string[];
          p_recipient?: string | null;
        };
        Returns: { id: string; token: string }[];
      };
      revoke_companion_invite: { Args: { p_invite_id: string }; Returns: undefined };
      can_moderate_conversation: { Args: { p_conversation_id: string }; Returns: boolean };
      delete_room_message: { Args: { p_message_id: string }; Returns: undefined };
      pin_room_message: { Args: { p_message_id: string; p_pin: boolean }; Returns: undefined };
      companion_invite_card: {
        Args: { p_token: string };
        Returns: {
          id: string;
          sender_id: string;
          sender_name: string;
          sender_avatar: string | null;
          chapter_slug: string;
          phase: string;
          title: string;
          why: string | null;
          ask: string | null;
          share_story: boolean;
          share_current: boolean;
          share_future: boolean;
          moment_count: number;
          is_sender: boolean;
          for_someone_else: boolean;
          taken: boolean;
          my_status: InviteResponse | null;
          my_companion_id: string | null;
        }[];
      };
      respond_companion_invite: {
        Args: { p_token: string; p_accept: boolean };
        Returns: { status: "accepted" | "declined"; companion_id: string | null }[];
      };
      my_companion_invitations: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          token: string;
          title: string;
          chapter_slug: string;
          sender_id: string;
          sender_name: string;
          sender_avatar: string | null;
          created_at: string;
        }[];
      };
      walking_with: {
        Args: Record<string, never>;
        Returns: {
          companion_id: string;
          owner_id: string;
          owner_name: string;
          owner_avatar: string | null;
          chapter_slug: string;
          phase: string;
          title: string;
          milestone: string | null;
          milestone_date: string | null;
          latest_update: string | null;
          latest_update_at: string | null;
          muted: boolean;
          since: string;
        }[];
      };
      companion_detail: {
        Args: { p_companion_id: string };
        Returns: {
          companion_id: string;
          user_chapter_id: string;
          owner_id: string;
          owner_name: string;
          owner_avatar: string | null;
          companion_user_id: string;
          companion_name: string;
          companion_avatar: string | null;
          chapter_slug: string;
          phase: string;
          title: string;
          why: string | null;
          ask: string | null;
          share_story: boolean;
          share_current: boolean;
          share_future: boolean;
          where_now: string | null;
          milestone: string | null;
          milestone_date: string | null;
          note_updated_at: string | null;
          muted: boolean;
          is_owner: boolean;
          ended: boolean;
          since: string;
        }[];
      };
      companion_moments: {
        Args: { p_companion_id: string };
        Returns: {
          kind: "log" | "post";
          id: string;
          body: string | null;
          photo_path: string | null;
          entry_date: string;
          day_number: number;
          created_at: string;
        }[];
      };
      companion_shared_updates: {
        Args: { p_companion_id: string };
        Returns: { id: string; body: string | null; photo_path: string | null; created_at: string }[];
      };
      companion_thread: {
        Args: { p_companion_id: string };
        Returns: {
          id: string;
          author_id: string;
          author_name: string;
          author_avatar: string | null;
          body: string;
          created_at: string;
        }[];
      };
      send_companion_message: { Args: { p_companion_id: string; p_body: string }; Returns: string };
      mute_companion: { Args: { p_companion_id: string; p_muted: boolean }; Returns: undefined };
      end_companion: { Args: { p_companion_id: string }; Returns: undefined };
      chapter_companion_list: {
        Args: { p_user_chapter_id: string };
        Returns: {
          companion_id: string;
          user_id: string;
          name: string;
          avatar_url: string | null;
          since: string;
          share_story: boolean;
          share_current: boolean;
          share_future: boolean;
          moment_count: number;
          last_message: string | null;
          last_message_at: string | null;
          last_message_mine: boolean | null;
        }[];
      };
      chapter_pending_invites: {
        Args: { p_user_chapter_id: string };
        Returns: {
          id: string;
          token: string;
          recipient_id: string | null;
          recipient_name: string | null;
          recipient_avatar: string | null;
          created_at: string;
        }[];
      };
      share_companion_update: {
        Args: { p_user_chapter_id: string; p_body: string | null; p_photo_path?: string | null; p_companion_ids?: string[] | null };
        Returns: string;
      };
      set_companion_note: {
        Args: { p_user_chapter_id: string; p_where_now: string | null; p_milestone: string | null; p_milestone_date?: string | null };
        Returns: undefined;
      };
      set_companion_moments: {
        Args: { p_companion_id: string; p_log_entry_ids: string[]; p_post_ids: string[] };
        Returns: number;
      };
      group_request_outcome: { Args: { p_group_id: string }; Returns: RequestStatus | null };
      acknowledge_group_request: { Args: { p_group_id: string }; Returns: undefined };
      admin_pending_requests: {
        Args: Record<string, never>;
        Returns: { group_id: string; pending: number }[];
      };
      sync_my_spaces: { Args: Record<string, never>; Returns: undefined };
      choose_active_spaces: { Args: { p_user_chapter_ids: string[] }; Returns: undefined };
      resume_space: { Args: { p_user_chapter_id: string }; Returns: undefined };
      my_referral: {
        Args: Record<string, never>;
        Returns: { code: string; invites_sent: number; friends_joined: number; rewards_earned: number }[];
      };
      my_referrals: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          invitee_id: string;
          first_name: string;
          avatar_url: string | null;
          status: ReferralStatus;
          joined_at: string;
          qualified_at: string | null;
          applied_at: string | null;
          nudged_at: string | null;
        }[];
      };
      referral_inviter: { Args: { p_code: string }; Returns: { first_name: string; avatar_url: string | null }[] };
      claim_referral: { Args: { p_code: string }; Returns: boolean };
      record_referral_invite: { Args: { p_channel: "email" | "message" | "share" }; Returns: undefined };
      nudge_referral: { Args: { p_referral_id: string }; Returns: undefined };
      claim_referral_reward: { Args: { p_referral_id: string }; Returns: string };
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
          p_scope?: "home" | "all" | "roots" | "open" | "mine" | "person";
          p_chapter_slug?: string | null;
          p_from?: string | null;
          p_to?: string | null;
          p_before?: string | null;
          p_before_id?: string | null;
          p_limit?: number;
          p_post_id?: string | null;
          p_within_km?: number | null;
          p_author_id?: string | null;
        };
        Returns: {
          id: string;
          chapter_slug: string;
          kind: PostKind;
          title: string | null;
          progress: PostProgress | null;
          body: string | null;
          is_anonymous: boolean;
          open_grove: boolean;
          comments_count: number;
          created_at: string;
          author_id: string | null;
          author_name: string | null;
          author_avatar: string | null;
          author_phase: string | null;
          is_mine: boolean;
          rooted: boolean;
          media: {
            kind: MediaKind;
            path: string;
            trim_start: number | null;
            trim_end: number | null;
            width: number | null;
            height: number | null;
          }[];
          audience: Audience;
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
          /** Only the asker gets times back. */
          expires_at: string | null;
          created_at: string | null;
          is_mine: boolean;
          reply_count: number;
        }[];
      };
      request_connection: {
        Args: { p_other: string; p_chapter_slug?: string | null };
        Returns: ConnectionRow;
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
            phase: string;
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
          art: string;
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
          latitude: number | null;
          longitude: number | null;
          distance_km: number | null;
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
      sync_billing: {
        Args: {
          p_user_id: string;
          p_status: "trialing" | "active" | "past_due" | "canceled" | "expired" | null;
          p_store: string | null;
          p_current_period_end: string | null;
          p_trial_end: string | null;
          p_cancel_at_period_end: boolean;
          p_management_url: string | null;
          /** RevenueCat product id of the running plan. */
          p_plan?: string | null;
        };
        Returns: undefined;
      };
      start_call: {
        Args: { p_conversation_id: string; p_kind: CallKind };
        Returns: Database["public"]["Tables"]["calls"]["Row"];
      };
      answer_call: {
        Args: { p_call_id: string };
        Returns: Database["public"]["Tables"]["calls"]["Row"];
      };
      end_call: {
        Args: { p_call_id: string };
        Returns: Database["public"]["Tables"]["calls"]["Row"];
      };
      finish_call: {
        Args: { p_call_id: string };
        Returns: undefined;
      };
      set_my_region: {
        Args: { p_latitude: number | null; p_longitude: number | null };
        Returns: undefined;
      };
      has_region: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      am_i_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      moderation_queue: {
        Args: { p_limit?: number };
        Returns: {
          target_type: ReportTarget;
          target_id: string;
          report_count: number;
          reasons: ReportReason[];
          details: string[];
          first_reported_at: string;
          preview: string | null;
          target_author_id: string | null;
          target_author_name: string | null;
          target_gone: boolean;
        }[];
      };
      moderate_target: {
        Args: { p_target_type: ReportTarget; p_target_id: string; p_action: "dismiss" | "remove"; p_note?: string | null };
        Returns: number;
      };
      username_available: { Args: { p_username: string }; Returns: boolean };
      my_report: {
        Args: { p_report_id: string };
        Returns: {
          id: string;
          target_type: ReportTarget;
          reason: ReportReason;
          status: "open" | "reviewing" | "actioned" | "dismissed";
          created_at: string;
          reviewed_at: string | null;
          subject: string | null;
        }[];
      };
      export_my_data: { Args: Record<string, never>; Returns: Json };
      focus_digest: {
        Args: Record<string, never>;
        Returns: {
          started_at: string;
          ended_at: string;
          new_matches: number;
          bond_messages: number;
          bond_sender: string | null;
          other_messages: number;
          other_sender: string | null;
          group_replies: number;
          group_title: string | null;
          post_comments: number;
        }[];
      };
      claim_notification_emails: {
        Args: { p_limit?: number };
        Returns: {
          notification_id: string;
          kind: NotificationKind;
          recipient_email: string;
          recipient_name: string;
          actor_name: string | null;
          entity_id: string | null;
          data: Json;
          group_slug: string | null;
          group_title: string | null;
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
          same_stage: boolean;
          waved_at_me: boolean;
          i_waved: boolean;
        }[];
      };
      wave_nearby: { Args: { p_user_id: string }; Returns: undefined };
      match_candidates: {
        Args: { p_chapter_slug?: string | null; p_global?: boolean; p_page?: number };
        Returns: {
          user_id: string;
          first_name: string;
          avatar_url: string | null;
          aura: Aura;
          chapter_slug: string;
          phase: string;
        }[];
      };
      introduce: {
        Args: { p_user_a: string; p_user_b: string; p_note?: string | null };
        Returns: Database["public"]["Tables"]["introductions"]["Row"];
      };
      acknowledge_chapter: { Args: { p_notification_id: string }; Returns: undefined };
      set_primary_chapter: { Args: { p_user_chapter_id: string }; Returns: undefined };
      set_chat_muted: { Args: { p_conversation_id: string; p_muted: boolean }; Returns: undefined };
      block_user: { Args: { p_user_id: string }; Returns: undefined };
      unblock_user: { Args: { p_user_id: string }; Returns: undefined };
      edit_my_message: { Args: { p_message: string; p_body: string }; Returns: string };
      delete_my_message: { Args: { p_message: string }; Returns: undefined };
      my_unread_messages: {
        Args: Record<string, never>;
        Returns: { unread: number; latest_sender: string | null }[];
      };
      open_grove_available: { Args: { p_chapter_slug: string }; Returns: boolean };
      set_my_timezone: { Args: { p_timezone: string }; Returns: undefined };
      my_daily_cards: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          card_id: string;
          kind: CardKind;
          chapter_slug: string | null;
          title: string;
          body: string;
          expires_at: string;
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
      bond_origin: BondOrigin;
      checkin_mode: CheckinMode;
      bond_activity_kind: BondActivityKind;
      connection_status: ConnectionStatus;
      post_kind: PostKind;
      post_progress: PostProgress;
      media_kind: MediaKind;
      report_reason: ReportReason;
      card_kind: CardKind;
      proximity_mode: ProximityMode;
      notification_kind: NotificationKind;
      invite_response: InviteResponse;
      wrap_range: WrapRange;
      audience: Audience;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
