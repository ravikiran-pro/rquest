/**
 * AI routes — mounted at /api/v1/ai (behind authMiddleware; see routes/index.js).
 *
 *   POST /ai/voice   multipart  field "audio"  -> { text, language? }
 *                    (?search=1 also returns a smart-search intent for the transcript)
 *   POST /ai/ocr     multipart  field "image"  (or JSON { imageUrl })
 *                    (?structured=1 returns { text, items, language })
 *   POST /ai/search  JSON       { query }       -> { intent }
 *   GET  /ai/status  -> provider/config/models (debugging)
 *
 * File uploads use in-memory multer (no disk writes); buffers go straight to
 * the AI gateway. The OpenAI key lives only in env — never touches the client.
 */

const express = require('express');
const multer = require('multer');
const ai = require('../../services/ai');

const router = express.Router();

// In-memory storage; cap sizes (OpenAI limits: ~25MB audio, ~20MB image).
const uploadAudio = multer({ limits: { fileSize: 25 * 1024 * 1024 } });
const uploadImage = multer({ limits: { fileSize: 20 * 1024 * 1024 } });

const truthy = (v) => v === true || v === '1' || v === 'true';

/** POST /ai/voice — transcribe an uploaded audio clip. */
const voiceHandler = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ success: false, message: 'audio file (field "audio") is required' });
    }

    const result = await ai.transcribe({ buffer: req.file.buffer });

    // Optional one-shot "speak a search": transcript -> structured intent.
    let search;
    if (truthy(req.query.search) && result.text) {
      search = await ai.smartSearch({ query: result.text });
    }

    return res.status(200).json({
      success: true,
      text: result.text,
      language: result.language,
      model: result.model,
      ...(result.devMode ? { devMode: true } : {}),
      ...(search ? { intent: search.intent } : {}),
    });
  } catch (error) {
    console.error('AI voice error:', error.message);
    return res.status(502).json({ success: false, message: error.message });
  }
};

/** POST /ai/ocr — extract text from an uploaded image or an imageUrl. */
const ocrHandler = async (req, res) => {
  try {
    const structured = truthy(req.query.structured) || truthy(req.body?.structured);
    const imageUrl = req.body?.imageUrl;
    const buffer = req.file && req.file.buffer;
    const mimetype = req.file && req.file.mimetype;

    if (!buffer && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'an image file (field "image") or imageUrl is required',
      });
    }

    const result = await ai.ocr({ buffer, mimetype, imageUrl, structured });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('AI ocr error:', error.message);
    return res.status(502).json({ success: false, message: error.message });
  }
};

/** POST /ai/search — natural-language query -> structured search intent. */
const searchHandler = async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query || !String(query).trim()) {
      return res.status(400).json({ success: false, message: 'query is required' });
    }
    const result = await ai.smartSearch({ query });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('AI search error:', error.message);
    return res.status(502).json({ success: false, message: error.message });
  }
};

/** GET /ai/status — provider/config/models (handy for debugging). */
const statusHandler = (_req, res) =>
  res.status(200).json({ success: true, ...ai.status() });

router.post('/voice', uploadAudio.single('audio'), voiceHandler);
router.post('/ocr', uploadImage.single('image'), ocrHandler);
router.post('/search', searchHandler);
router.get('/status', statusHandler);

module.exports = router;
