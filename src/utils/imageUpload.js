import { supabase } from '../lib/supabase.js'
import logger from '../lib/logger.js'

export async function uploadImageToSupabase(fileBuffer, fileName) {
  try {
    // Create a new Supabase client instance for this operation
    const supabaseAdmin = supabase.auth.admin
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (error) {
      logger.error('Supabase storage error during image upload:', {
        error: error.message,
        fileName,
        bucket: 'product-images',
        contentType: 'image/jpeg'
      });
      throw error
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    logger.info('Image uploaded successfully to Supabase storage', {
      fileName,
      bucket: 'product-images',
      publicUrl
    });

    return publicUrl
  } catch (error) {
    logger.error('Error uploading image to Supabase:', {
      error: error.message,
      stack: error.stack,
      fileName
    });
    throw error
  }
}

export async function deleteImageFromSupabase(fileName) {
  try {
    const { error } = await supabase.storage
      .from('product-images')
      .remove([fileName])

    if (error) {
      logger.error('Supabase storage error during image deletion:', {
        error: error.message,
        fileName,
        bucket: 'product-images'
      });
      throw error
    }

    logger.info('Image deleted successfully from Supabase storage', {
      fileName,
      bucket: 'product-images'
    });
  } catch (error) {
    logger.error('Error deleting image from Supabase:', {
      error: error.message,
      stack: error.stack,
      fileName
    });
    throw error
  }
} 