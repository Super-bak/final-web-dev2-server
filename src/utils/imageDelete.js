import { supabase } from '../lib/supabase.js'
import logger from '../lib/logger.js'

export async function deleteImageFromSupabase(filePath) {
  try {
    // Delete file from Supabase Storage
    const { error } = await supabase.storage
      .from('product-images') // Your bucket name
      .remove([filePath])

    if (error) {
      logger.error('Supabase storage error during image deletion:', {
        error: error.message,
        filePath,
        bucket: 'product-images'
      });
      throw error;
    }

    logger.info('Image deleted successfully from Supabase storage', {
      filePath,
      bucket: 'product-images'
    });

    return true
  } catch (error) {
    logger.error('Error deleting image from Supabase:', {
      error: error.message,
      stack: error.stack,
      filePath
    });
    throw error
  }
} 