import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generatePlaceholderSVG = (width, height) => {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#f0f0f0" stroke="#cccccc" stroke-width="2" />
      <text x="${width/2}" y="${height/2}" font-family="Arial" font-size="${Math.floor(Math.min(width, height) / 10)}" 
        fill="#999999" text-anchor="middle" dominant-baseline="middle">${width}x${height}</text>
    </svg>
  `;
};

// Route to return placeholder images with specified dimensions
router.get('/:width/:height', (req, res) => {
  const width = parseInt(req.params.width, 10) || 400;
  const height = parseInt(req.params.height, 10) || 320;
  
  const svgContent = generatePlaceholderSVG(width, height);
  
  res.set('Content-Type', 'image/svg+xml');
  res.send(svgContent);
});

export default router; 