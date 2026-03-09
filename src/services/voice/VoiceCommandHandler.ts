/**
 * VoiceCommandHandler Service
 * Processes voice commands and routes them to appropriate handlers
 */

import {
  VoiceCommand,
  VoiceCommandResult,
  VoiceCommandType,
  SupportedLanguage,
} from '../../types/voice.types';

/**
 * Voice command handler that processes natural language commands
 * and routes them to appropriate feature handlers
 */
class VoiceCommandHandler {
  private commands: Map<VoiceCommandType, VoiceCommand> = new Map();
  // @ts-expect-error - Reserved for future use
  private _currentLanguage: SupportedLanguage = 'hi-IN';

  constructor() {
    this.initializeCommands();
  }

  /**
   * Initialize default voice commands
   */
  private initializeCommands(): void {
    // Weather commands
    this.registerCommand({
      type: VoiceCommandType.WEATHER,
      keywords: ['weather', 'mausam', 'climate', 'rainfall', 'temperature'],
      handler: this.handleWeatherCommand.bind(this),
    });

    // Market prices commands
    this.registerCommand({
      type: VoiceCommandType.MARKET_PRICES,
      keywords: ['price', 'market', 'mandi', 'bhav', 'rate'],
      handler: this.handleMarketPricesCommand.bind(this),
    });

    // Schemes commands
    this.registerCommand({
      type: VoiceCommandType.SCHEMES,
      keywords: ['scheme', 'yojana', 'subsidy', 'government', 'sarkar'],
      handler: this.handleSchemesCommand.bind(this),
    });

    // Training commands
    this.registerCommand({
      type: VoiceCommandType.TRAINING,
      keywords: ['training', 'learn', 'lesson', 'siksha', 'video'],
      handler: this.handleTrainingCommand.bind(this),
    });

    // Recommendations commands
    this.registerCommand({
      type: VoiceCommandType.RECOMMENDATIONS,
      keywords: ['recommend', 'suggest', 'advice', 'salah', 'crop', 'fertilizer', 'seed'],
      handler: this.handleRecommendationsCommand.bind(this),
    });

    // Dashboard commands
    this.registerCommand({
      type: VoiceCommandType.DASHBOARD,
      keywords: ['dashboard', 'home', 'main', 'summary', 'overview'],
      handler: this.handleDashboardCommand.bind(this),
    });

    // Alerts commands
    this.registerCommand({
      type: VoiceCommandType.ALERTS,
      keywords: ['alert', 'reminder', 'notification', 'chetavani'],
      handler: this.handleAlertsCommand.bind(this),
    });

    // Soil health commands
    this.registerCommand({
      type: VoiceCommandType.SOIL_HEALTH,
      keywords: ['soil', 'mitti', 'health', 'test', 'nutrient'],
      handler: this.handleSoilHealthCommand.bind(this),
    });

    // Navigation commands
    this.registerCommand({
      type: VoiceCommandType.NAVIGATION,
      keywords: ['go', 'open', 'navigate', 'back'],
      handler: this.handleNavigationCommand.bind(this),
    });

    // Search commands
    this.registerCommand({
      type: VoiceCommandType.SEARCH,
      keywords: ['search', 'find', 'khojo', 'look'],
      handler: this.handleSearchCommand.bind(this),
    });
  }

  /**
   * Register a new voice command
   */
  registerCommand(command: VoiceCommand): void {
    this.commands.set(command.type, command);
  }

  /**
   * Process a voice command
   */
  async processCommand(transcript: string): Promise<VoiceCommandResult> {
    const normalizedTranscript = transcript.toLowerCase().trim();

    // Find matching command
    const matchedCommand = this.findMatchingCommand(normalizedTranscript);

    if (!matchedCommand) {
      return {
        understood: false,
        action: VoiceCommandType.UNKNOWN,
        parameters: {},
        response: 'I did not understand that command. Please try again.',
      };
    }

    // Extract parameters from transcript
    const parameters = this.extractParameters(normalizedTranscript, matchedCommand.type);

    // Execute command handler
    try {
      return await matchedCommand.handler(parameters);
    } catch (error) {
      console.error('Error executing voice command:', error);
      return {
        understood: true,
        action: matchedCommand.type,
        parameters,
        response: 'Sorry, there was an error processing your command.',
      };
    }
  }

  /**
   * Find matching command based on keywords
   */
  private findMatchingCommand(transcript: string): VoiceCommand | null {
    // Sort commands by keyword length (longer keywords first for better matching)
    const sortedCommands = Array.from(this.commands.values()).sort((a, b) => {
      const maxLengthA = Math.max(...a.keywords.map(k => k.length));
      const maxLengthB = Math.max(...b.keywords.map(k => k.length));
      return maxLengthB - maxLengthA;
    });

    for (const command of sortedCommands) {
      for (const keyword of command.keywords) {
        if (transcript.includes(keyword.toLowerCase())) {
          return command;
        }
      }
    }
    return null;
  }

  /**
   * Extract parameters from transcript based on command type
   */
  private extractParameters(transcript: string, commandType: VoiceCommandType): any {
    const params: any = {};

    switch (commandType) {
      case VoiceCommandType.SEARCH:
        // Extract search query (everything after "search" or "find")
        const searchMatch = transcript.match(/(?:search|find|khojo|look)\s+(?:for\s+)?(.+)/i);
        if (searchMatch) {
          params.query = searchMatch[1].trim();
        }
        break;

      case VoiceCommandType.MARKET_PRICES:
        // Extract crop name if mentioned
        const cropMatch = transcript.match(/(?:price|bhav|rate)\s+(?:of\s+)?(\w+)/i);
        if (cropMatch) {
          params.crop = cropMatch[1].trim();
        }
        break;

      case VoiceCommandType.RECOMMENDATIONS:
        // Extract recommendation type (crop, fertilizer, seed)
        if (transcript.includes('crop')) {
          params.type = 'crop';
        } else if (transcript.includes('fertilizer') || transcript.includes('khad')) {
          params.type = 'fertilizer';
        } else if (transcript.includes('seed') || transcript.includes('beej')) {
          params.type = 'seed';
        }
        break;

      case VoiceCommandType.NAVIGATION:
        // Extract navigation target
        if (transcript.includes('back')) {
          params.action = 'back';
        }
        break;
    }

    return params;
  }

  /**
   * Set current language for command processing
   */
  setLanguage(language: SupportedLanguage): void {
    this._currentLanguage = language;
  }

  // Command handlers

  private async handleWeatherCommand(params: any): Promise<VoiceCommandResult> {
    return {
      understood: true,
      action: VoiceCommandType.WEATHER,
      parameters: params,
      response: 'Opening weather information',
    };
  }

  private async handleMarketPricesCommand(params: any): Promise<VoiceCommandResult> {
    return {
      understood: true,
      action: VoiceCommandType.MARKET_PRICES,
      parameters: params,
      response: params.crop
        ? `Showing market prices for ${params.crop}`
        : 'Opening market prices',
    };
  }

  private async handleSchemesCommand(params: any): Promise<VoiceCommandResult> {
    return {
      understood: true,
      action: VoiceCommandType.SCHEMES,
      parameters: params,
      response: 'Opening government schemes',
    };
  }

  private async handleTrainingCommand(params: any): Promise<VoiceCommandResult> {
    return {
      understood: true,
      action: VoiceCommandType.TRAINING,
      parameters: params,
      response: 'Opening training lessons',
    };
  }

  private async handleRecommendationsCommand(params: any): Promise<VoiceCommandResult> {
    const type = params.type || 'general';
    return {
      understood: true,
      action: VoiceCommandType.RECOMMENDATIONS,
      parameters: params,
      response: `Showing ${type} recommendations`,
    };
  }

  private async handleDashboardCommand(params: any): Promise<VoiceCommandResult> {
    return {
      understood: true,
      action: VoiceCommandType.DASHBOARD,
      parameters: params,
      response: 'Opening dashboard',
    };
  }

  private async handleAlertsCommand(params: any): Promise<VoiceCommandResult> {
    return {
      understood: true,
      action: VoiceCommandType.ALERTS,
      parameters: params,
      response: 'Opening alerts',
    };
  }

  private async handleSoilHealthCommand(params: any): Promise<VoiceCommandResult> {
    return {
      understood: true,
      action: VoiceCommandType.SOIL_HEALTH,
      parameters: params,
      response: 'Opening soil health information',
    };
  }

  private async handleNavigationCommand(params: any): Promise<VoiceCommandResult> {
    return {
      understood: true,
      action: VoiceCommandType.NAVIGATION,
      parameters: params,
      response: params.action === 'back' ? 'Going back' : 'Navigating',
    };
  }

  private async handleSearchCommand(params: any): Promise<VoiceCommandResult> {
    return {
      understood: true,
      action: VoiceCommandType.SEARCH,
      parameters: params,
      response: params.query ? `Searching for ${params.query}` : 'What would you like to search?',
    };
  }
}

export default VoiceCommandHandler;
