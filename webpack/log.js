const path = require("path");
const { G, R, Y, L } = require("./colors");

const LEVELS = ["debug", "note", "warn", "error"];
const LEVELS_PRETTY = ["ᴅᴇʙᴜɢ", " ɴᴏᴛᴇ", " ᴡᴀʀɴ", "ᴇʀʀᴏʀ"];

function shouldLog(loggerLevel, level) {
  return LEVELS.indexOf(level) >= LEVELS.indexOf(loggerLevel);
}

function validateLevel(level) {
  if (!LEVELS.includes(level)) {
    throw new Error(
      `Invalid log level "${level}", must be one of: ${LEVELS.join(", ")}`,
    );
  }
}

function prettyLevel(level) {
  if (level === "event") {
    return "ᴇᴠᴇɴᴛ";
  }
  const i = LEVELS.indexOf(level);
  return LEVELS_PRETTY[i] || level;
}

function makeLogger(name, logLevel = "note") {
  validateLevel(logLevel);

  if (!name) {
    name = "";
  } else {
    // Allow for passing __filename
    name = path.basename(name);
  }

  const logger = {
    /** Don't log if the level is < minLogLevel */
    setMinLogLevel(minLogLevel) {
      this.minLogLevel = minLogLevel;
    },
    getArgs(level, strings, args, colorFn) {
      const params = [];
      params.push(colorFn`${prettyLevel(level)}` + "\t");
      params.push(L`${format(strings, ...args)}`);
      return params;
    },
    debug(strings, ...args) {
      if (shouldLog(this.minLogLevel, "debug")) {
        console.debug(...this.getArgs("debug", strings, args, L));
      }
    },
    note(strings, ...args) {
      if (shouldLog(this.minLogLevel, "note")) {
        console.info(...this.getArgs("note", strings, args, L));
      }
    },
    warn(strings, ...args) {
      if (shouldLog(this.minLogLevel, "warn")) {
        console.warn(...this.getArgs("warn", strings, args, Y));
      }
    },
    error(strings, ...args) {
      if (shouldLog(this.minLogLevel, "error")) {
        console.error(...this.getArgs("error", strings, args, R));
      }
    },
    event(strings, ...args) {
      console.info(...this.getArgs("event", strings, args, G));
    },
  };

  logger.setMinLogLevel(logLevel);
  return logger;
}

function format(strings, ...args) {
  // Called as template tag: first arg is an array-like with .raw
  if (strings && typeof strings === "object" && "raw" in strings) {
    try {
      return String.raw(strings, ...args);
    } catch (e) {
      // fallback to safe join
    }
  }

  // Normal call: join all args into a single string
  const parts = [strings, ...args].map((part) => {
    if (part === undefined) return "undefined";
    if (part === null) return "null";
    if (typeof part === "string") return part;
    try {
      return typeof part === "object" ? JSON.stringify(part) : String(part);
    } catch (e) {
      return String(part);
    }
  });
  return parts.join(" ");
}

module.exports = {
  makeLogger,
};
