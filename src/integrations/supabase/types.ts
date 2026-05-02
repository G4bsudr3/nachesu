export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      archetype_artwork_versions: {
        Row: {
          archetype: Database["public"]["Enums"]["builder_archetype"]
          generated_at: string
          id: string
          image_url: string
          is_current: boolean
          model: string | null
          preset: string | null
          prompt_used: string | null
          seed: string | null
          variables: Json | null
        }
        Insert: {
          archetype: Database["public"]["Enums"]["builder_archetype"]
          generated_at?: string
          id?: string
          image_url: string
          is_current?: boolean
          model?: string | null
          preset?: string | null
          prompt_used?: string | null
          seed?: string | null
          variables?: Json | null
        }
        Update: {
          archetype?: Database["public"]["Enums"]["builder_archetype"]
          generated_at?: string
          id?: string
          image_url?: string
          is_current?: boolean
          model?: string | null
          preset?: string | null
          prompt_used?: string | null
          seed?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      archetype_artworks: {
        Row: {
          archetype: Database["public"]["Enums"]["builder_archetype"]
          generated_at: string
          image_url: string
          model: string | null
          prompt_used: string | null
        }
        Insert: {
          archetype: Database["public"]["Enums"]["builder_archetype"]
          generated_at?: string
          image_url: string
          model?: string | null
          prompt_used?: string | null
        }
        Update: {
          archetype?: Database["public"]["Enums"]["builder_archetype"]
          generated_at?: string
          image_url?: string
          model?: string | null
          prompt_used?: string | null
        }
        Relationships: []
      }
      builder_cards: {
        Row: {
          archetype: Database["public"]["Enums"]["builder_archetype"] | null
          created_at: string
          emoji: string | null
          error_message: string | null
          essence_phrase: string | null
          first_viewed_at: string | null
          full_text: string | null
          generated_at: string | null
          id: string
          image_generated_at: string | null
          image_url: string | null
          is_published: boolean
          model: string | null
          next_move_text: string | null
          og_image_generated_at: string | null
          reasoning: string | null
          shadow_text: string | null
          share_token: string | null
          status: Database["public"]["Enums"]["builder_card_status"]
          superpower_text: string | null
          tagline: string | null
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          archetype?: Database["public"]["Enums"]["builder_archetype"] | null
          created_at?: string
          emoji?: string | null
          error_message?: string | null
          essence_phrase?: string | null
          first_viewed_at?: string | null
          full_text?: string | null
          generated_at?: string | null
          id?: string
          image_generated_at?: string | null
          image_url?: string | null
          is_published?: boolean
          model?: string | null
          next_move_text?: string | null
          og_image_generated_at?: string | null
          reasoning?: string | null
          shadow_text?: string | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["builder_card_status"]
          superpower_text?: string | null
          tagline?: string | null
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          archetype?: Database["public"]["Enums"]["builder_archetype"] | null
          created_at?: string
          emoji?: string | null
          error_message?: string | null
          essence_phrase?: string | null
          first_viewed_at?: string | null
          full_text?: string | null
          generated_at?: string | null
          id?: string
          image_generated_at?: string | null
          image_url?: string | null
          is_published?: boolean
          model?: string | null
          next_move_text?: string | null
          og_image_generated_at?: string | null
          reasoning?: string | null
          shadow_text?: string | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["builder_card_status"]
          superpower_text?: string | null
          tagline?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: []
      }
      chora_bot_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          tokens: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          tokens?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chora_bot_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "chora_bot_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      chora_bot_conversations: {
        Row: {
          created_at: string
          favorited_at: string | null
          id: string
          is_favorite: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          favorited_at?: string | null
          id?: string
          is_favorite?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          favorited_at?: string | null
          id?: string
          is_favorite?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chora_bot_documents: {
        Row: {
          chunks_count: number
          content_md: string
          created_at: string
          created_by: string
          id: string
          indexed_at: string | null
          published: boolean
          source_kind: string
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          chunks_count?: number
          content_md?: string
          created_at?: string
          created_by: string
          id?: string
          indexed_at?: string | null
          published?: boolean
          source_kind?: string
          storage_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          chunks_count?: number
          content_md?: string
          created_at?: string
          created_by?: string
          id?: string
          indexed_at?: string | null
          published?: boolean
          source_kind?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chora_bot_messages: {
        Row: {
          content: string
          context_chunk_ids: string[] | null
          conversation_id: string
          cost_usd_estimate: number
          created_at: string
          id: string
          role: string
          tokens_in: number
          tokens_out: number
          user_id: string
        }
        Insert: {
          content: string
          context_chunk_ids?: string[] | null
          conversation_id: string
          cost_usd_estimate?: number
          created_at?: string
          id?: string
          role: string
          tokens_in?: number
          tokens_out?: number
          user_id: string
        }
        Update: {
          content?: string
          context_chunk_ids?: string[] | null
          conversation_id?: string
          cost_usd_estimate?: number
          created_at?: string
          id?: string
          role?: string
          tokens_in?: number
          tokens_out?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chora_bot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chora_bot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chora_bot_settings: {
        Row: {
          cutoff_at: string
          embedding_model: string
          enabled: boolean
          id: number
          match_count: number
          model: string
          similarity_threshold: number
          system_prompt: string
          updated_at: string
          welcome_message: string
        }
        Insert: {
          cutoff_at?: string
          embedding_model?: string
          enabled?: boolean
          id?: number
          match_count?: number
          model?: string
          similarity_threshold?: number
          system_prompt?: string
          updated_at?: string
          welcome_message?: string
        }
        Update: {
          cutoff_at?: string
          embedding_model?: string
          enabled?: boolean
          id?: number
          match_count?: number
          model?: string
          similarity_threshold?: number
          system_prompt?: string
          updated_at?: string
          welcome_message?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      fbi_responses: {
        Row: {
          algo_mais: string | null
          cidade: string | null
          created_at: string
          email: string | null
          expectativa_chora: string | null
          experiencia_lovable: string | null
          id: string
          idade: number | null
          ideia_gaveta: string | null
          instagram: string | null
          invited_participant_id: string | null
          ja_fez_perestroika: string | null
          legacy_data: Json | null
          linkedin: string | null
          locomocao: string | null
          maior_desafio: string | null
          nickname: string | null
          nome: string | null
          perde_nocao_tempo: string | null
          quais_cursos_perestroika: string | null
          restricao_alimentar: string | null
          submitted: boolean
          submitted_at: string | null
          trabalho: string | null
          ultima_criacao_orgulho: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          algo_mais?: string | null
          cidade?: string | null
          created_at?: string
          email?: string | null
          expectativa_chora?: string | null
          experiencia_lovable?: string | null
          id?: string
          idade?: number | null
          ideia_gaveta?: string | null
          instagram?: string | null
          invited_participant_id?: string | null
          ja_fez_perestroika?: string | null
          legacy_data?: Json | null
          linkedin?: string | null
          locomocao?: string | null
          maior_desafio?: string | null
          nickname?: string | null
          nome?: string | null
          perde_nocao_tempo?: string | null
          quais_cursos_perestroika?: string | null
          restricao_alimentar?: string | null
          submitted?: boolean
          submitted_at?: string | null
          trabalho?: string | null
          ultima_criacao_orgulho?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          algo_mais?: string | null
          cidade?: string | null
          created_at?: string
          email?: string | null
          expectativa_chora?: string | null
          experiencia_lovable?: string | null
          id?: string
          idade?: number | null
          ideia_gaveta?: string | null
          instagram?: string | null
          invited_participant_id?: string | null
          ja_fez_perestroika?: string | null
          legacy_data?: Json | null
          linkedin?: string | null
          locomocao?: string | null
          maior_desafio?: string | null
          nickname?: string | null
          nome?: string | null
          perde_nocao_tempo?: string | null
          quais_cursos_perestroika?: string | null
          restricao_alimentar?: string | null
          submitted?: boolean
          submitted_at?: string | null
          trabalho?: string | null
          ultima_criacao_orgulho?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      future_letter_groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          letter_text: string
          sent_at: string | null
          session_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          letter_text?: string
          sent_at?: string | null
          session_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          letter_text?: string
          sent_at?: string | null
          session_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "future_letter_groups_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "future_letter_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      future_letter_members: {
        Row: {
          created_at: string
          email_message_id: string | null
          email_sent_at: string | null
          email_snapshot: string | null
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_message_id?: string | null
          email_sent_at?: string | null
          email_snapshot?: string | null
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_message_id?: string | null
          email_sent_at?: string | null
          email_snapshot?: string | null
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "future_letter_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "future_letter_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      future_letter_responses: {
        Row: {
          created_at: string
          created_by: string
          id: string
          letter_text: string
          member_user_ids: string[]
          session_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          letter_text: string
          member_user_ids?: string[]
          session_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          letter_text?: string
          member_user_ids?: string[]
          session_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "future_letter_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "future_letter_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      future_letter_sessions: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          send_at: string
          slug: string
          status: Database["public"]["Enums"]["future_letter_session_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          send_at: string
          slug: string
          status?: Database["public"]["Enums"]["future_letter_session_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          send_at?: string
          slug?: string
          status?: Database["public"]["Enums"]["future_letter_session_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hub_album_photos: {
        Row: {
          caption: string | null
          created_at: string
          height: number | null
          id: string
          storage_path: string
          user_id: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          storage_path: string
          user_id: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          storage_path?: string
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      hub_certificates: {
        Row: {
          archetype: Database["public"]["Enums"]["builder_archetype"] | null
          design_variant: string
          file_url: string
          generated_at: string
          id: string
          user_id: string
        }
        Insert: {
          archetype?: Database["public"]["Enums"]["builder_archetype"] | null
          design_variant: string
          file_url: string
          generated_at?: string
          id?: string
          user_id: string
        }
        Update: {
          archetype?: Database["public"]["Enums"]["builder_archetype"] | null
          design_variant?: string
          file_url?: string
          generated_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      hub_comments: {
        Row: {
          body: string
          created_at: string
          gif_preview_url: string | null
          gif_provider: string | null
          gif_url: string | null
          id: string
          target_id: string
          target_kind: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          gif_preview_url?: string | null
          gif_provider?: string | null
          gif_url?: string | null
          id?: string
          target_id: string
          target_kind?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          gif_preview_url?: string | null
          gif_provider?: string | null
          gif_url?: string | null
          id?: string
          target_id?: string
          target_kind?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hub_event_feedback: {
        Row: {
          algo_que_amou: string | null
          created_at: string
          event_day: string
          experiencia: string | null
          id: string
          poderia_ser_diferente: string | null
          user_id: string
        }
        Insert: {
          algo_que_amou?: string | null
          created_at?: string
          event_day?: string
          experiencia?: string | null
          id?: string
          poderia_ser_diferente?: string | null
          user_id: string
        }
        Update: {
          algo_que_amou?: string | null
          created_at?: string
          event_day?: string
          experiencia?: string | null
          id?: string
          poderia_ser_diferente?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hub_event_feedback_final: {
        Row: {
          certificate_archetype:
            | Database["public"]["Enums"]["builder_archetype"]
            | null
          certificate_generated_at: string | null
          conteudo_faltou: string | null
          coracao_aberto: string | null
          created_at: string
          geral: string | null
          id: string
          mais_gostou: string | null
          melhoria_entregas: number
          menos_gostou: string | null
          nota_imersao: number
          nota_profs: number
          nps_recomendacao: number
          user_id: string
        }
        Insert: {
          certificate_archetype?:
            | Database["public"]["Enums"]["builder_archetype"]
            | null
          certificate_generated_at?: string | null
          conteudo_faltou?: string | null
          coracao_aberto?: string | null
          created_at?: string
          geral?: string | null
          id?: string
          mais_gostou?: string | null
          melhoria_entregas: number
          menos_gostou?: string | null
          nota_imersao: number
          nota_profs: number
          nps_recomendacao: number
          user_id: string
        }
        Update: {
          certificate_archetype?:
            | Database["public"]["Enums"]["builder_archetype"]
            | null
          certificate_generated_at?: string | null
          conteudo_faltou?: string | null
          coracao_aberto?: string | null
          created_at?: string
          geral?: string | null
          id?: string
          mais_gostou?: string | null
          melhoria_entregas?: number
          menos_gostou?: string | null
          nota_imersao?: number
          nota_profs?: number
          nps_recomendacao?: number
          user_id?: string
        }
        Relationships: []
      }
      hub_insights: {
        Row: {
          aggregates: Json | null
          created_at: string
          generated_at: string
          id: string
          matches: Json | null
          scope: string
          theme_primary: string | null
          theme_tags: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aggregates?: Json | null
          created_at?: string
          generated_at?: string
          id?: string
          matches?: Json | null
          scope: string
          theme_primary?: string | null
          theme_tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aggregates?: Json | null
          created_at?: string
          generated_at?: string
          id?: string
          matches?: Json | null
          scope?: string
          theme_primary?: string | null
          theme_tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      hub_materials: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          external_url: string | null
          file_mime: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          kind: string
          order_index: number
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          external_url?: string | null
          file_mime?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          kind: string
          order_index?: number
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          external_url?: string | null
          file_mime?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          kind?: string
          order_index?: number
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hub_projects: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string
          id: string
          link: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description: string
          id?: string
          link: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string
          id?: string
          link?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hub_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          target_id: string
          target_kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          target_id: string
          target_kind?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          target_id?: string
          target_kind?: string
          user_id?: string
        }
        Relationships: []
      }
      hub_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      invited_participants: {
        Row: {
          cidade: string | null
          ctx_expectativa: string | null
          ctx_experiencia_lovable: string | null
          ctx_maior_trava: string | null
          email: string
          email_alias: string | null
          event_slug: string
          id: string
          imported_at: string
          instagram: string | null
          ja_fez_perestroika: string | null
          name: string | null
          nickname: string | null
          quais_cursos_perestroika: string | null
          trabalho: string | null
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          ctx_expectativa?: string | null
          ctx_experiencia_lovable?: string | null
          ctx_maior_trava?: string | null
          email: string
          email_alias?: string | null
          event_slug?: string
          id?: string
          imported_at?: string
          instagram?: string | null
          ja_fez_perestroika?: string | null
          name?: string | null
          nickname?: string | null
          quais_cursos_perestroika?: string | null
          trabalho?: string | null
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          ctx_expectativa?: string | null
          ctx_experiencia_lovable?: string | null
          ctx_maior_trava?: string | null
          email?: string
          email_alias?: string | null
          event_slug?: string
          id?: string
          imported_at?: string
          instagram?: string | null
          ja_fez_perestroika?: string | null
          name?: string | null
          nickname?: string | null
          quais_cursos_perestroika?: string | null
          trabalho?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      mascote_votes: {
        Row: {
          candidate_index: number
          created_at: string
          id: string
          insight_id: string
          user_id: string
        }
        Insert: {
          candidate_index: number
          created_at?: string
          id?: string
          insight_id: string
          user_id: string
        }
        Update: {
          candidate_index?: number
          created_at?: string
          id?: string
          insight_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mascote_votes_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "hub_insights"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_submissions: {
        Row: {
          created_at: string
          descricao: string
          feedback: string | null
          id: string
          link: string
          mission_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["mission_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao: string
          feedback?: string | null
          id?: string
          link: string
          mission_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          feedback?: string | null
          id?: string
          link?: string
          mission_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_submissions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          created_at: string
          descricao: string | null
          duracao_min: number | null
          id: string
          instrucao: string | null
          ordem: number
          published: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          duracao_min?: number | null
          id?: string
          instrucao?: string | null
          ordem?: number
          published?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          duracao_min?: number | null
          id?: string
          instrucao?: string | null
          ordem?: number
          published?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      module_deliverables: {
        Row: {
          content: Json
          created_at: string
          feedback: string | null
          id: string
          kind: Database["public"]["Enums"]["deliverable_kind"]
          module_id: string
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["deliverable_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          feedback?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["deliverable_kind"]
          module_id: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["deliverable_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          feedback?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["deliverable_kind"]
          module_id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["deliverable_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_deliverables_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_pills: {
        Row: {
          attachment_url: string | null
          body_md: string
          created_at: string
          duration_min_high: number | null
          duration_min_low: number | null
          id: string
          kind: Database["public"]["Enums"]["pill_kind"]
          module_id: string
          order_index: number
          published: boolean
          required: boolean
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          attachment_url?: string | null
          body_md?: string
          created_at?: string
          duration_min_high?: number | null
          duration_min_low?: number | null
          id?: string
          kind: Database["public"]["Enums"]["pill_kind"]
          module_id: string
          order_index?: number
          published?: boolean
          required?: boolean
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          attachment_url?: string | null
          body_md?: string
          created_at?: string
          duration_min_high?: number | null
          duration_min_low?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["pill_kind"]
          module_id?: string
          order_index?: number
          published?: boolean
          required?: boolean
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_pills_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_ratings: {
        Row: {
          comment: string | null
          created_at: string
          module_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          module_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          module_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_ratings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          available_from: string | null
          created_at: string
          deliverable_description: string | null
          id: string
          number: number
          objective: string | null
          order_index: number
          published: boolean
          title: string
          total_minutes: number
          trail_id: string
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          created_at?: string
          deliverable_description?: string | null
          id?: string
          number: number
          objective?: string | null
          order_index?: number
          published?: boolean
          title: string
          total_minutes?: number
          trail_id: string
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          created_at?: string
          deliverable_description?: string | null
          id?: string
          number?: number
          objective?: string | null
          order_index?: number
          published?: boolean
          title?: string
          total_minutes?: number
          trail_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      prework_items: {
        Row: {
          created_at: string
          descricao: string | null
          duracao_min: number | null
          id: string
          obrigatorio: boolean
          ordem: number
          published: boolean
          tipo: string
          titulo: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          duracao_min?: number | null
          id?: string
          obrigatorio?: boolean
          ordem?: number
          published?: boolean
          tipo: string
          titulo: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          duracao_min?: number | null
          id?: string
          obrigatorio?: boolean
          ordem?: number
          published?: boolean
          tipo?: string
          titulo?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      prework_progress: {
        Row: {
          completed_at: string
          item_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          item_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prework_progress_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "prework_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by_admin_id: string | null
          avatar_url: string | null
          bio: string | null
          cidade: string | null
          created_at: string
          display_name: string | null
          has_password: boolean
          id: string
          instagram: string | null
          linkedin: string | null
          nickname: string | null
          slug: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_admin_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          cidade?: string | null
          created_at?: string
          display_name?: string | null
          has_password?: boolean
          id?: string
          instagram?: string | null
          linkedin?: string | null
          nickname?: string | null
          slug?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by_admin_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          cidade?: string | null
          created_at?: string
          display_name?: string | null
          has_password?: boolean
          id?: string
          instagram?: string | null
          linkedin?: string | null
          nickname?: string | null
          slug?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_votes: {
        Row: {
          created_at: string
          id: string
          project_id: string
          session_id: string
          updated_at: string
          voter_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          session_id: string
          updated_at?: string
          voter_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          session_id?: string
          updated_at?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_votes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "hub_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_votes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "project_voting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_voting_sessions: {
        Row: {
          closes_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          opens_at: string | null
          status: Database["public"]["Enums"]["project_voting_session_status"]
          title: string
          updated_at: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          opens_at?: string | null
          status?: Database["public"]["Enums"]["project_voting_session_status"]
          title: string
          updated_at?: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          opens_at?: string | null
          status?: Database["public"]["Enums"]["project_voting_session_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_module_progress: {
        Row: {
          completed_at: string | null
          module_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          module_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          module_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      student_pill_progress: {
        Row: {
          completed_at: string
          pill_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          pill_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          pill_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_pill_progress_pill_id_fkey"
            columns: ["pill_id"]
            isOneToOne: false
            referencedRelation: "module_pills"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      trails: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          order_index: number
          pbl_prompt: string | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          pbl_prompt?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          pbl_prompt?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tutor_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          trail_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          trail_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          trail_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_conversations_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_idea: {
        Row: {
          created_at: string
          idea: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          idea: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          idea?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tutorial_progress: {
        Row: {
          completed_at: string
          step_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          step_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          step_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_pending_profiles: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          nickname: string
          user_id: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          is_admin: boolean
          nickname: string
          roles: string[]
          status: string
          user_id: string
        }[]
      }
      can_submit_public_fbi: { Args: { _email: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_share_token: { Args: never; Returns: string }
      get_my_card_state: {
        Args: never
        Returns: {
          first_viewed_at: string
          has_card: boolean
          is_published: boolean
          status: Database["public"]["Enums"]["builder_card_status"]
          view_count: number
        }[]
      }
      get_my_future_letter_group: {
        Args: { _session_id: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          letter_text: string
          member_user_ids: string[]
          sent_at: string
          session_id: string
          submitted_at: string
        }[]
      }
      get_my_future_letter_response: {
        Args: { _session_id: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          letter_text: string
          member_user_ids: string[]
          session_id: string
          submitted_at: string
        }[]
      }
      get_my_project_vote_result: {
        Args: { _session_id: string }
        Returns: {
          in_top_ten: boolean
          project_id: string
          rank: number
          title: string
          vote_count: number
        }[]
      }
      get_project_voting_top_ten: {
        Args: { _session_id: string }
        Returns: {
          author_display_name: string
          author_nickname: string
          author_user_id: string
          cover_url: string
          description: string
          link: string
          project_id: string
          rank: number
          tags: string[]
          title: string
          vote_count: number
        }[]
      }
      get_public_card_by_token: {
        Args: { _token: string }
        Returns: {
          archetype: Database["public"]["Enums"]["builder_archetype"]
          display_name: string
          emoji: string
          essence_phrase: string
          image_url: string
          is_published: boolean
          nickname: string
          superpower_preview: string
          tagline: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_future_letter_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_future_letter_group_open: {
        Args: { _group_id: string }
        Returns: boolean
      }
      is_future_letter_group_open_and_owned: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_invited_canonical: {
        Args: { _email: string }
        Returns: {
          canonical_email: string
          is_alias: boolean
        }[]
      }
      lookup_user_by_email: {
        Args: { _email: string }
        Returns: {
          has_password: boolean
          user_id: string
        }[]
      }
      mark_card_first_view: { Args: { _token: string }; Returns: undefined }
      match_chora_bot_chunks: {
        Args: {
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          content: string
          document_id: string
          document_title: string
          id: string
          similarity: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      save_future_letter_response: {
        Args: {
          _letter_text: string
          _member_user_ids?: string[]
          _session_id: string
        }
        Returns: {
          id: string
          member_user_ids: string[]
          session_id: string
          submitted_at: string
        }[]
      }
      seal_future_letter: {
        Args: {
          _letter_text: string
          _member_user_ids?: string[]
          _session_id: string
        }
        Returns: {
          group_id: string
          submitted_at: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "mentor" | "participant"
      builder_archetype:
        | "visionario"
        | "artesao"
        | "experimentador"
        | "conector"
        | "pragmatico"
        | "narrador"
      builder_card_status: "gerando" | "pronta" | "erro"
      deliverable_kind: "link" | "text" | "checklist" | "mixed"
      deliverable_status: "rascunho" | "enviado" | "revisado"
      future_letter_session_status: "draft" | "open" | "closed" | "sent"
      mission_status: "pendente" | "aprovada" | "ajustar"
      pill_kind:
        | "pilula_a"
        | "pilula_b"
        | "pilula_c"
        | "exercicio_pbl"
        | "registro"
      project_voting_session_status: "draft" | "open" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "mentor", "participant"],
      builder_archetype: [
        "visionario",
        "artesao",
        "experimentador",
        "conector",
        "pragmatico",
        "narrador",
      ],
      builder_card_status: ["gerando", "pronta", "erro"],
      deliverable_kind: ["link", "text", "checklist", "mixed"],
      deliverable_status: ["rascunho", "enviado", "revisado"],
      future_letter_session_status: ["draft", "open", "closed", "sent"],
      mission_status: ["pendente", "aprovada", "ajustar"],
      pill_kind: [
        "pilula_a",
        "pilula_b",
        "pilula_c",
        "exercicio_pbl",
        "registro",
      ],
      project_voting_session_status: ["draft", "open", "closed"],
    },
  },
} as const
