/**
 * Lambda handlers for Government Scheme APIs
 * Requirements: 2.1, 2.5
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { schemeService } from '../../services/scheme/SchemeService';
import { eligibilityChecker } from '../../services/scheme/EligibilityChecker';
import { applicationGuide } from '../../services/scheme/ApplicationGuide';
import { logger } from '../../utils/logger';

/**
 * Get all active schemes
 */
export const getAllSchemes = async (
  _event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('Getting all schemes');

    const schemes = await schemeService.getAllSchemes();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: schemes,
        count: schemes.length,
      }),
    };
  } catch (error) {
    logger.error('Error getting schemes', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve schemes',
      }),
    };
  }
};

/**
 * Get scheme by ID
 */
export const getSchemeById = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const schemeId = event.pathParameters?.schemeId;

    if (!schemeId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Scheme ID is required',
        }),
      };
    }

    logger.info(`Getting scheme ${schemeId}`);

    const scheme = await schemeService.getSchemeById(schemeId);

    if (!scheme) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Scheme not found',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: scheme,
      }),
    };
  } catch (error) {
    logger.error('Error getting scheme', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve scheme',
      }),
    };
  }
};

/**
 * Get schemes by category
 */
export const getSchemesByCategory = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const category = event.pathParameters?.category;

    if (!category) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Category is required',
        }),
      };
    }

    logger.info(`Getting schemes for category ${category}`);

    const schemes = await schemeService.getSchemesByCategory(category as any);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: schemes,
        count: schemes.length,
      }),
    };
  } catch (error) {
    logger.error('Error getting schemes by category', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve schemes',
      }),
    };
  }
};

/**
 * Check eligibility for a scheme
 */
export const checkEligibility = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const schemeId = event.pathParameters?.schemeId;

    if (!schemeId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Scheme ID is required',
        }),
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'User profile is required',
        }),
      };
    }

    const userProfile = JSON.parse(event.body);

    logger.info(`Checking eligibility for scheme ${schemeId}`);

    const scheme = await schemeService.getSchemeById(schemeId);

    if (!scheme) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Scheme not found',
        }),
      };
    }

    const eligibilityResult = eligibilityChecker.checkEligibility(scheme, userProfile);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: eligibilityResult,
      }),
    };
  } catch (error) {
    logger.error('Error checking eligibility', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to check eligibility',
      }),
    };
  }
};

/**
 * Get eligible schemes for a user
 */
export const getEligibleSchemes = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'User profile is required',
        }),
      };
    }

    const userProfile = JSON.parse(event.body);

    logger.info('Getting eligible schemes for user');

    const allSchemes = await schemeService.getAllSchemes();
    const eligibleSchemes = eligibilityChecker.getEligibleSchemes(allSchemes, userProfile);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: eligibleSchemes,
        count: eligibleSchemes.length,
      }),
    };
  } catch (error) {
    logger.error('Error getting eligible schemes', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve eligible schemes',
      }),
    };
  }
};

/**
 * Get application guidance for a scheme
 */
export const getApplicationGuidance = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const schemeId = event.pathParameters?.schemeId;

    if (!schemeId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Scheme ID is required',
        }),
      };
    }

    logger.info(`Getting application guidance for scheme ${schemeId}`);

    const scheme = await schemeService.getSchemeById(schemeId);

    if (!scheme) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Scheme not found',
        }),
      };
    }

    const guidance = applicationGuide.getApplicationGuidance(scheme);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: guidance,
      }),
    };
  } catch (error) {
    logger.error('Error getting application guidance', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve application guidance',
      }),
    };
  }
};

/**
 * Get schemes with approaching deadlines
 */
export const getApproachingDeadlines = async (
  _event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('Getting schemes with approaching deadlines');

    const allSchemes = await schemeService.getAllSchemes();
    const reminders = applicationGuide.getSchemesWithApproachingDeadlines(allSchemes);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: reminders,
        count: reminders.length,
      }),
    };
  } catch (error) {
    logger.error('Error getting approaching deadlines', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve deadline reminders',
      }),
    };
  }
};
