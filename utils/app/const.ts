export const DEFAULT_SYSTEM_PROMPT = "always reply in hindi lanaguage , don't use english for any answer";

export const OPENAI_API_HOST =
  process.env.OPENAI_API_HOST || 'https://api.openai.com';

export const DEFAULT_TEMPERATURE = 
  parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || "1");

export const OPENAI_API_TYPE =
  process.env.OPENAI_API_TYPE || 'openai';

export const OPENAI_API_VERSION =
  process.env.OPENAI_API_VERSION || '2023-03-15-preview';

export const OPENAI_ORGANIZATION =
  process.env.OPENAI_ORGANIZATION || '';

export const AZURE_DEPLOYMENT_ID =
  process.env.AZURE_DEPLOYMENT_ID || '';




//   export const DEFAULT_SYSTEM_PROMPT =
//   process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||  "Always provide a more relevant list of brand names when the user enters a keyword. If the user enters multiple keywords at once, instruct them to enter only one keyword. If the user provides additional details or instructions, advise them to enter only their preferred keyword. Ensure that the list contains only brand names without any additional information, instructions, or details. A maximum of 10 brand names should suffice";

// export const OPENAI_API_HOST =
//   process.env.OPENAI_API_HOST || 'https://api.openai.com';

// export const DEFAULT_TEMPERATURE = 
//   parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || "1");

// export const OPENAI_API_TYPE =
//   process.env.OPENAI_API_TYPE || 'openai';

// export const OPENAI_API_VERSION =
//   process.env.OPENAI_API_VERSION || '2023-03-15-preview';

// export const OPENAI_ORGANIZATION =
//   process.env.OPENAI_ORGANIZATION || '';

// export const AZURE_DEPLOYMENT_ID =
//   process.env.AZURE_DEPLOYMENT_ID || '';

