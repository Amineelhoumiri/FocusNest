--
-- PostgreSQL database dump
--

\restrict vKTMONeR95wOcbDFO5oMF9P47I0VRDkFoVrVuKMKftWg99Ca2NZmcDll2n5wHpA

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: chat_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.chat_role AS ENUM (
    'user',
    'assistant',
    'system'
);


ALTER TYPE public.chat_role OWNER TO postgres;

--
-- Name: consent_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.consent_category AS ENUM (
    'core',
    'ai',
    'spotify'
);


ALTER TYPE public.consent_category OWNER TO postgres;

--
-- Name: reflection_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.reflection_type AS ENUM (
    'Distraction',
    'Low Energy',
    'External'
);


ALTER TYPE public.reflection_type OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account (
    account_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    encrypted_email bytea NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);


ALTER TABLE public.account OWNER TO postgres;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    chat_message_id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_session_id uuid NOT NULL,
    role public.chat_role NOT NULL,
    content bytea NOT NULL,
    token_count integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chat_messages_token_count_check CHECK ((token_count >= 0))
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_sessions (
    chat_session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone
);


ALTER TABLE public.chat_sessions OWNER TO postgres;

--
-- Name: consent_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consent_audit_log (
    consent_audit_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    consented_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    policy_version text NOT NULL,
    consent_type public.consent_category NOT NULL,
    consent_value boolean NOT NULL,
    ip_address text
);


ALTER TABLE public.consent_audit_log OWNER TO postgres;

--
-- Name: openai_usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.openai_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    chat_session_id uuid NOT NULL,
    model text NOT NULL,
    prompt_tokens integer DEFAULT 0 NOT NULL,
    completion_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    cost_usd numeric(10,6) DEFAULT 0.000000 NOT NULL,
    request_ip_hashed text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.openai_usage OWNER TO postgres;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    token_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    device_hint text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone NOT NULL,
    is_revoked boolean DEFAULT false
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    task_id uuid NOT NULL,
    start_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    end_time timestamp with time zone,
    is_active boolean DEFAULT true,
    reflection_type public.reflection_type,
    reflection_content bytea,
    outcome text
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: spotify_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.spotify_accounts (
    spotify_acc_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    spotify_user_id bytea NOT NULL,
    access_token bytea NOT NULL,
    refresh_token bytea NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    scopes text
);


ALTER TABLE public.spotify_accounts OWNER TO postgres;

--
-- Name: subtasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subtasks (
    subtask_id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    subtask_name bytea NOT NULL,
    subtask_status character varying(50) DEFAULT 'Backlog'::character varying NOT NULL,
    energy_level character varying(20) NOT NULL,
    is_approved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT subtasks_energy_level_check CHECK (((energy_level)::text = ANY ((ARRAY['Low'::character varying, 'High'::character varying])::text[]))),
    CONSTRAINT subtasks_subtask_status_check CHECK (((subtask_status)::text = ANY ((ARRAY['Backlog'::character varying, 'Ready'::character varying, 'Doing'::character varying, 'Done'::character varying])::text[])))
);


ALTER TABLE public.subtasks OWNER TO postgres;

--
-- Name: system_prompts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_prompts (
    key text NOT NULL,
    prompt text NOT NULL
);


ALTER TABLE public.system_prompts OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    task_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    task_name bytea NOT NULL,
    task_status character varying(50) DEFAULT 'Backlog'::character varying NOT NULL,
    energy_level character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tasks_energy_level_check CHECK (((energy_level)::text = ANY ((ARRAY['Low'::character varying, 'High'::character varying])::text[]))),
    CONSTRAINT tasks_task_status_check CHECK (((task_status)::text = ANY ((ARRAY['Backlog'::character varying, 'Ready'::character varying, 'Doing'::character varying, 'Done'::character varying])::text[])))
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name character varying(100) NOT NULL,
    date_of_birth date NOT NULL,
    address text,
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_login_at timestamp with time zone,
    is_consented_core boolean DEFAULT false NOT NULL,
    is_consented_ai boolean DEFAULT false NOT NULL,
    is_consented_spotify boolean DEFAULT false NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: account account_encrypted_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_encrypted_email_key UNIQUE (encrypted_email);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (account_id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (chat_message_id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (chat_session_id);


--
-- Name: consent_audit_log consent_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_audit_log
    ADD CONSTRAINT consent_audit_log_pkey PRIMARY KEY (consent_audit_id);


--
-- Name: openai_usage openai_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.openai_usage
    ADD CONSTRAINT openai_usage_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (token_id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (session_id);


--
-- Name: spotify_accounts spotify_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spotify_accounts
    ADD CONSTRAINT spotify_accounts_pkey PRIMARY KEY (spotify_acc_id);


--
-- Name: subtasks subtasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtasks
    ADD CONSTRAINT subtasks_pkey PRIMARY KEY (subtask_id);


--
-- Name: system_prompts system_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_prompts
    ADD CONSTRAINT system_prompts_pkey PRIMARY KEY (key);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (task_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_consent_user_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consent_user_type ON public.consent_audit_log USING btree (user_id, consent_type);


--
-- Name: idx_openai_usage_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_openai_usage_created ON public.openai_usage USING btree (created_at);


--
-- Name: idx_openai_usage_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_openai_usage_user ON public.openai_usage USING btree (user_id);


--
-- Name: idx_refresh_tokens_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_hash ON public.refresh_tokens USING btree (token_hash);


--
-- Name: idx_refresh_tokens_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_session_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_session_active ON public.session USING btree (is_active);


--
-- Name: account account_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_chat_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_chat_session_id_fkey FOREIGN KEY (chat_session_id) REFERENCES public.chat_sessions(chat_session_id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: consent_audit_log consent_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_audit_log
    ADD CONSTRAINT consent_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: openai_usage openai_usage_chat_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.openai_usage
    ADD CONSTRAINT openai_usage_chat_session_id_fkey FOREIGN KEY (chat_session_id) REFERENCES public.chat_sessions(chat_session_id) ON DELETE CASCADE;


--
-- Name: openai_usage openai_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.openai_usage
    ADD CONSTRAINT openai_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: session session_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(task_id) ON DELETE CASCADE;


--
-- Name: session session_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: spotify_accounts spotify_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spotify_accounts
    ADD CONSTRAINT spotify_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: subtasks subtasks_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtasks
    ADD CONSTRAINT subtasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(task_id) ON DELETE CASCADE;


--
-- Name: tasks tasks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict vKTMONeR95wOcbDFO5oMF9P47I0VRDkFoVrVuKMKftWg99Ca2NZmcDll2n5wHpA

