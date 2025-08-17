import { Client, Message, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export interface BotConfig {
  discord: {
    token: string;
    clientId: string;
    guildId?: string;
  };
  ssh: {
    host: string;
    port: number;
    username: string;
    privateKeyPath?: string;
    password?: string;
  };
  security: {
    allowedCommands: string[];
    adminRoles: string[];
    rateLimitWindow: number;
    rateLimitMax: number;
  };
  logging: {
    level: string;
    file: string;
  };
  database: {
    path: string;
  };
}

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  cooldown?: number;
  permissions?: string[];
}

export interface LegacyCommand {
  name: string;
  description: string;
  execute: (message: Message, args: string[]) => Promise<void>;
  cooldown?: number;
  permissions?: string[];
}

export interface SSHCommandResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export interface RateLimitInfo {
  userId: string;
  commandName: string;
  timestamp: number;
  count: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  command: string;
  args: string[];
  timestamp: Date;
  success: boolean;
  error?: string;
  ipAddress?: string;
}

export interface ServerMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
  uptime: number;
  timestamp: Date;
}

export interface BotClient extends Client {
  commands: Map<string, Command>;
  legacyCommands: Map<string, LegacyCommand>;
  cooldowns: Map<string, Map<string, number>>;
  config: BotConfig;
}

export interface DatabaseConnection {
  init: () => Promise<void>;
  close: () => Promise<void>;
  logCommand: (log: AuditLog) => Promise<void>;
  getCommandHistory: (userId: string, limit?: number) => Promise<AuditLog[]>;
  saveMetrics: (metrics: ServerMetrics) => Promise<void>;
  getMetrics: (hours?: number) => Promise<ServerMetrics[]>;
}
