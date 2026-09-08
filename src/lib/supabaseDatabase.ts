export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          role: string;
          is_online: boolean;
          streak: number;
          reading_time: number;
          hide_personal_info: boolean;
          hide_email: boolean;
          bio: string | null;
          accolades: string[] | null;
          cover_photo_url: string | null;
          registered_at: string;
          last_active_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          avatar_url?: string | null;
          role?: string;
          is_online?: boolean;
          streak?: number;
          reading_time?: number;
          hide_personal_info?: boolean;
          hide_email?: boolean;
          bio?: string | null;
          accolades?: string[] | null;
          cover_photo_url?: string | null;
          registered_at?: string;
          last_active_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          role?: string;
          is_online?: boolean;
          streak?: number;
          reading_time?: number;
          hide_personal_info?: boolean;
          hide_email?: boolean;
          bio?: string | null;
          accolades?: string[] | null;
          cover_photo_url?: string | null;
          registered_at?: string;
          last_active_at?: string;
          created_at?: string;
        };
      };
      friends: {
        Row: {
          user_id: string;
          friend_email: string;
          connected_at: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          friend_email: string;
          connected_at?: number;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          friend_email?: string;
          connected_at?: number;
          created_at?: string;
        };
      };
      followers: {
        Row: {
          user_id: string;
          follower_email: string;
          followed_at: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          follower_email: string;
          followed_at?: number;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          follower_email?: string;
          followed_at?: number;
          created_at?: string;
        };
      };
      blocks: {
        Row: {
          user_id: string;
          blocked_email: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          blocked_email: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          blocked_email?: string;
          created_at?: string;
        };
      };
      friend_requests: {
        Row: {
          user_id: string;
          to_email: string;
          status: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          to_email: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          to_email?: string;
          status?: string;
          created_at?: string;
        };
      };
      articles: {
        Row: {
          id: string;
          slug: string;
          title: Json;
          excerpt: Json;
          body: Json;
          category: string;
          tags: string[] | null;
          image_url: string | null;
          author: string | null;
          date: string;
          published_at: string;
          is_published: boolean;
          is_draft: boolean;
          view_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug?: string;
          title: Json;
          excerpt: Json;
          body: Json;
          category: string;
          tags?: string[] | null;
          image_url?: string | null;
          author?: string | null;
          date?: string;
          published_at?: string;
          is_published?: boolean;
          is_draft?: boolean;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: Json;
          excerpt?: Json;
          body?: Json;
          category?: string;
          tags?: string[] | null;
          image_url?: string | null;
          author?: string | null;
          date?: string;
          published_at?: string;
          is_published?: boolean;
          is_draft?: boolean;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          article_id: string;
          author_email: string;
          author_name: string;
          text: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          author_email: string;
          author_name: string;
          text: string;
          date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          author_email?: string;
          author_name?: string;
          text?: string;
          date?: string;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          sender: string;
          receiver: string;
          text: string;
          date: string;
          timestamp: number;
          read: boolean;
          attachment: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender: string;
          receiver: string;
          text: string;
          date?: string;
          timestamp?: number;
          read?: boolean;
          attachment?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender?: string;
          receiver?: string;
          text?: string;
          date?: string;
          timestamp?: number;
          read?: boolean;
          attachment?: Json | null;
          created_at?: string;
        };
      };
      subscribers: {
        Row: {
          id: string;
          email: string;
          date: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          date?: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          date?: string;
          active?: boolean;
          created_at?: string;
        };
      };
      media: {
        Row: {
          id: string;
          url: string;
          type: string;
          name: string;
          size: number;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          type: string;
          name: string;
          size?: number;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          type?: string;
          name?: string;
          size?: number;
          uploaded_by?: string | null;
          created_at?: string;
        };
      };
      ads: {
        Row: {
          id: string;
          title: string | null;
          image_url: string | null;
          link_url: string | null;
          placement: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title?: string | null;
          image_url?: string | null;
          link_url?: string | null;
          placement?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string | null;
          image_url?: string | null;
          link_url?: string | null;
          placement?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      site_settings: {
        Row: {
          id: string;
          data: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          data: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          data?: Json;
          updated_at?: string;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          session_id: string;
          event_name: string;
          path: string;
          article_id: string;
          article_title: string;
          category: string;
          device_type: string;
          country: string;
          city: string;
          timestamp: string;
          user_email: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          event_name: string;
          path: string;
          article_id?: string;
          article_title?: string;
          category?: string;
          device_type?: string;
          country?: string;
          city?: string;
          timestamp?: string;
          user_email?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          event_name?: string;
          path?: string;
          article_id?: string;
          article_title?: string;
          category?: string;
          device_type?: string;
          country?: string;
          city?: string;
          timestamp?: string;
          user_email?: string;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      user_consents: {
        Row: {
          id: string;
          session_id: string;
          user_email: string;
          essential: boolean;
          analytics: boolean;
          personalization: boolean;
          marketing: boolean;
          device_type: string;
          locale: string;
          country: string;
          city: string;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_email?: string;
          essential?: boolean;
          analytics?: boolean;
          personalization?: boolean;
          marketing?: boolean;
          device_type?: string;
          locale?: string;
          country?: string;
          city?: string;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_email?: string;
          essential?: boolean;
          analytics?: boolean;
          personalization?: boolean;
          marketing?: boolean;
          device_type?: string;
          locale?: string;
          country?: string;
          city?: string;
          updated_at?: string;
          created_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          league: string;
          league_label: Json | null;
          team_a: Json | null;
          team_b: Json | null;
          status: string;
          date: string | null;
          time: string | null;
          arena: string | null;
          context_info: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          league?: string;
          league_label?: Json | null;
          team_a?: Json | null;
          team_b?: Json | null;
          status?: string;
          date?: string | null;
          time?: string | null;
          arena?: string | null;
          context_info?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          league?: string;
          league_label?: Json | null;
          team_a?: Json | null;
          team_b?: Json | null;
          status?: string;
          date?: string | null;
          time?: string | null;
          arena?: string | null;
          context_info?: Json | null;
          created_at?: string;
        };
      };
    };
    Functions: {};
    Enums: {};
  };
}
