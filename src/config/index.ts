import * as dotenv from 'dotenv';
import * as Joi from 'joi';
import { BotConfig } from '../types';

dotenv.config();

const configSchema = Joi.object({
  DISCORD_TOKEN: Joi.string().required(),
  DISCORD_CLIENT_ID: Joi.string().required(),
  DISCORD_GUILD_ID: Joi.string().optional(),
  
  SSH_HOST: Joi.string().required(),
  SSH_PORT: Joi.number().default(22),
  SSH_USERNAME: Joi.string().required(),
  SSH_PRIVATE_KEY_PATH: Joi.string().optional(),
  SSH_PASSWORD: Joi.string().optional(),
  
  ALLOWED_COMMANDS: Joi.string().default('ls,ps,df,free,uptime,whoami'),
  ADMIN_ROLES: Joi.string().default('Administrator'),
  RATE_LIMIT_WINDOW: Joi.number().default(60000), // 1 minute
  RATE_LIMIT_MAX: Joi.number().default(5),
  
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE: Joi.string().default('logs/bot.log'),
  
  DATABASE_PATH: Joi.string().default('data/bot.db'),
}).and('SSH_PRIVATE_KEY_PATH', 'SSH_PASSWORD');

export function validateConfig(): BotConfig {
  const { error, value } = configSchema.validate(process.env);
  
  if (error) {
    throw new Error(`Configuration validation error: ${error.message}`);
  }

  // Ensure either SSH key or password is provided
  if (!value.SSH_PRIVATE_KEY_PATH && !value.SSH_PASSWORD) {
    throw new Error('Either SSH_PRIVATE_KEY_PATH or SSH_PASSWORD must be provided');
  }

  return {
    discord: {
      token: value.DISCORD_TOKEN,
      clientId: value.DISCORD_CLIENT_ID,
      guildId: value.DISCORD_GUILD_ID,
    },
    ssh: {
      host: value.SSH_HOST,
      port: value.SSH_PORT,
      username: value.SSH_USERNAME,
      privateKeyPath: value.SSH_PRIVATE_KEY_PATH,
      password: value.SSH_PASSWORD,
    },
    security: {
      allowedCommands: value.ALLOWED_COMMANDS.split(',').map((cmd: string) => cmd.trim()),
      adminRoles: value.ADMIN_ROLES.split(',').map((role: string) => role.trim()),
      rateLimitWindow: value.RATE_LIMIT_WINDOW,
      rateLimitMax: value.RATE_LIMIT_MAX,
    },
    logging: {
      level: value.LOG_LEVEL,
      file: value.LOG_FILE,
    },
    database: {
      path: value.DATABASE_PATH,
    },
  };
}

export const config = validateConfig();
