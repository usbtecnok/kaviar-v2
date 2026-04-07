// Adicione esta rota no seu app para monitorar produção
app.get('/health/db', async (req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT COUNT(*) as tables FROM pg_tables WHERE schemaname='public';`;
    const tableCount = result[0].tables;
    
    if (tableCount >= 22) {
      res.json({ 
        status: 'healthy', 
        database: 'neon',
        tables: tableCount,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ status: 'unhealthy', tables: tableCount });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});
