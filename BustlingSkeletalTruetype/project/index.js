const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

// Function to find available port
const findAvailablePort = (startPort) => {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.listen(startPort, (err) => {
      if (err) {
        server.close();
        resolve(findAvailablePort(startPort + 1));
      } else {
        const port = server.address().port;
        server.close();
        resolve(port);
      }
    });
  });
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openrouter.ai", process.env.SUPABASE_URL].filter(Boolean)
    }
  }
}));

app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : true)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Serve static files from dist directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
} else {
  app.use(express.static(path.join(__dirname)));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit AI requests to 10 per minute
  message: 'AI request limit exceeded, please wait before trying again.'
});

app.use(limiter);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

// Middleware to verify Supabase JWT
const verifyAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Chat with AI endpoint - requires authentication
app.post('/api/chat', aiLimiter, verifyAuth, async (req, res) => {
  try {
    const { message, targetLanguage } = req.body;

    if (!message || !targetLanguage) {
      return res.status(400).json({ error: 'Message and target language are required' });
    }

    const prompt = `You are a helpful language learning assistant. The user is learning ${targetLanguage}. 
    Respond to their message in ${targetLanguage}, keeping your response at an appropriate level for a language learner.
    Be encouraging and natural. Message: "${message}"`;

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'anthropic/claude-3-haiku',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://languella.onrender.com',
        'X-Title': 'Languella - AI Language Learning'
      }
    });

    const aiMessage = response.data.choices[0].message.content;

    // Get translation
    const translationResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'anthropic/claude-3-haiku',
      messages: [
        { role: 'user', content: `Translate this ${targetLanguage} text to English and provide a brief grammatical breakdown with parts of speech: "${aiMessage}"` }
      ],
      max_tokens: 300,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://languella.onrender.com',
        'X-Title': 'Languella - AI Language Learning'
      }
    });

    const translation = translationResponse.data.choices[0].message.content;

    // Save chat history for authenticated user
    await supabase.from('chat_history').insert([
      {
        user_id: req.user.id,
        user_message: message,
        ai_message: aiMessage,
        translation: translation,
        target_language: targetLanguage,
        created_at: new Date().toISOString()
      }
    ]);

    res.json({
      message: aiMessage,
      translation: translation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Explain text endpoint - requires authentication
app.post('/api/explain', aiLimiter, verifyAuth, async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Text and target language are required' });
    }

    const prompt = `Explain this ${targetLanguage} text in simple English for a language learner. 
    Include: meaning, grammar breakdown, and cultural context if relevant. 
    Keep it concise and educational. Text: "${text}"`;

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'anthropic/claude-3-haiku',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 400,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://languella.onrender.com',
        'X-Title': 'Languella - AI Language Learning'
      }
    });

    const explanation = response.data.choices[0].message.content;

    res.json({
      explanation: explanation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Explain error:', error);
    res.status(500).json({ 
      error: 'Failed to get explanation',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Study words endpoints
app.post('/api/study-words', verifyAuth, async (req, res) => {
  try {
    const { word, definition, example, targetLanguage } = req.body;

    if (!word || !definition) {
      return res.status(400).json({ error: 'Word and definition are required' });
    }

    const { data, error } = await supabase
      .from('study_words')
      .insert([
        {
          user_id: req.user.id,
          word: word,
          definition: definition,
          example: example || '',
          target_language: targetLanguage,
          created_at: new Date().toISOString(),
          review_count: 0,
          last_reviewed: null
        }
      ])
      .select();

    if (error) throw error;

    res.json({ success: true, data: data[0] });

  } catch (error) {
    console.error('Study words error:', error);
    res.status(500).json({ error: 'Failed to save study word' });
  }
});

app.get('/api/study-words', verifyAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('study_words')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ words: data || [] });

  } catch (error) {
    console.error('Get study words error:', error);
    res.status(500).json({ error: 'Failed to fetch study words' });
  }
});

app.put('/api/study-words/:id/review', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('study_words')
      .update({
        review_count: supabase.raw('review_count + 1'),
        last_reviewed: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select();

    if (error) throw error;

    res.json({ success: true, data: data[0] });

  } catch (error) {
    console.error('Review word error:', error);
    res.status(500).json({ error: 'Failed to update word review' });
  }
});

// Progress tracking
app.get('/api/progress', verifyAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get today's chat count
    const { data: chatData, error: chatError } = await supabase
      .from('chat_history')
      .select('id')
      .eq('user_id', req.user.id)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z');

    if (chatError) throw chatError;

    // Get total words studied
    const { data: wordsData, error: wordsError } = await supabase
      .from('study_words')
      .select('id')
      .eq('user_id', req.user.id);

    if (wordsError) throw wordsError;

    // Get words reviewed today
    const { data: reviewedData, error: reviewedError } = await supabase
      .from('study_words')
      .select('id')
      .eq('user_id', req.user.id)
      .gte('last_reviewed', today + 'T00:00:00.000Z')
      .lt('last_reviewed', today + 'T23:59:59.999Z');

    if (reviewedError) throw reviewedError;

    res.json({
      todayChats: chatData?.length || 0,
      totalWords: wordsData?.length || 0,
      todayReviews: reviewedData?.length || 0,
      date: today
    });

  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Serve static files - catch all handler for SPA
app.get('*', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start server with dynamic port finding for development, use PORT env var for production
(async () => {
  try {
    const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : await findAvailablePort(5000));
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Server accessible at: http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();