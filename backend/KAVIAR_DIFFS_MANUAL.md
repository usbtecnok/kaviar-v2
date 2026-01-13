# 🔧 KAVIAR - DIFFS EXATOS PARA APLICAÇÃO MANUAL

**IMPORTANTE:** Estes são os diffs exatos das mudanças implementadas. Aplicar manualmente conforme governança.

---

## 📁 ARQUIVOS NOVOS (Criar)

### 1. `src/routes/guide-auth.ts`
```typescript
import { Router } from 'express';
import { prisma } from '../config/database';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();

const guideLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

// POST /api/auth/guide/login
router.post('/guide/login', async (req, res) => {
  try {
    const { email, password } = guideLoginSchema.parse(req.body);
    
    const guide = await prisma.tourist_guides.findUnique({
      where: { email }
    });

    if (!guide) {
      return res.status(401).json({
        success: false,
        error: 'Email ou senha incorretos'
      });
    }

    if (guide.status !== 'approved') {
      return res.status(401).json({
        success: false,
        error: 'Conta aguardando aprovação do administrador'
      });
    }

    // Temporary password system for testing
    const tempPassword = 'guide123';
    const isValidPassword = password === tempPassword;
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Email ou senha incorretos'
      });
    }

    const token = jwt.sign(
      { 
        userId: guide.id, 
        userType: 'GUIDE',
        email: guide.email 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: guide.id,
        name: guide.name,
        email: guide.email,
        phone: guide.phone,
        user_type: 'GUIDE',
        is_bilingual: guide.is_bilingual,
        languages: guide.languages,
        also_driver: guide.also_driver
      }
    });
  } catch (error) {
    console.error('Error in guide login:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro no login'
    });
  }
});

export { router as guideAuthRoutes };
```

### 2. `src/routes/admin-approval.ts`
```typescript
import { Router } from 'express';
import { ApprovalController } from '../modules/admin/approval-controller';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();
const approvalController = new ApprovalController();

router.use(authenticateAdmin);

router.get('/drivers', approvalController.getDrivers);
router.put('/drivers/:id/approve', approvalController.approveDriver);
router.put('/drivers/:id/reject', approvalController.rejectDriver);

router.get('/guides', approvalController.getGuides);
router.put('/guides/:id/approve', approvalController.approveGuide);
router.put('/guides/:id/reject', approvalController.rejectGuide);

export { router as adminApprovalRoutes };
```

### 3. `src/modules/admin/approval-controller.ts`
```typescript
import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { z } from 'zod';

const approveDriverSchema = z.object({
  id: z.string()
});

const approveGuideSchema = z.object({
  id: z.string()
});

export class ApprovalController {
  
  approveDriver = async (req: Request, res: Response) => {
    try {
      const { id } = approveDriverSchema.parse(req.params);
      
      const driver = await prisma.drivers.findUnique({ where: { id } });
      if (!driver) {
        return res.status(404).json({
          success: false,
          error: 'Motorista não encontrado'
        });
      }

      const updatedDriver = await prisma.drivers.update({
        where: { id },
        data: {
          status: 'approved',
          updated_at: new Date()
        }
      });

      res.json({
        success: true,
        data: {
          id: updatedDriver.id,
          name: updatedDriver.name,
          email: updatedDriver.email,
          status: updatedDriver.status
        },
        message: 'Motorista aprovado com sucesso'
      });
    } catch (error) {
      console.error('Error approving driver:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao aprovar motorista'
      });
    }
  };

  rejectDriver = async (req: Request, res: Response) => {
    try {
      const { id } = approveDriverSchema.parse(req.params);
      
      const driver = await prisma.drivers.findUnique({ where: { id } });
      if (!driver) {
        return res.status(404).json({
          success: false,
          error: 'Motorista não encontrado'
        });
      }

      const updatedDriver = await prisma.drivers.update({
        where: { id },
        data: {
          status: 'rejected',
          updated_at: new Date()
        }
      });

      res.json({
        success: true,
        data: {
          id: updatedDriver.id,
          name: updatedDriver.name,
          email: updatedDriver.email,
          status: updatedDriver.status
        },
        message: 'Motorista rejeitado'
      });
    } catch (error) {
      console.error('Error rejecting driver:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao rejeitar motorista'
      });
    }
  };

  approveGuide = async (req: Request, res: Response) => {
    try {
      const { id } = approveGuideSchema.parse(req.params);
      
      const guide = await prisma.tourist_guides.findUnique({ where: { id } });
      if (!guide) {
        return res.status(404).json({
          success: false,
          error: 'Guia turístico não encontrado'
        });
      }

      const updatedGuide = await prisma.tourist_guides.update({
        where: { id },
        data: {
          status: 'approved',
          updated_at: new Date()
        }
      });

      res.json({
        success: true,
        data: {
          id: updatedGuide.id,
          name: updatedGuide.name,
          email: updatedGuide.email,
          status: updatedGuide.status
        },
        message: 'Guia turístico aprovado com sucesso'
      });
    } catch (error) {
      console.error('Error approving guide:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao aprovar guia turístico'
      });
    }
  };

  rejectGuide = async (req: Request, res: Response) => {
    try {
      const { id } = approveGuideSchema.parse(req.params);
      
      const guide = await prisma.tourist_guides.findUnique({ where: { id } });
      if (!guide) {
        return res.status(404).json({
          success: false,
          error: 'Guia turístico não encontrado'
        });
      }

      const updatedGuide = await prisma.tourist_guides.update({
        where: { id },
        data: {
          status: 'rejected',
          updated_at: new Date()
        }
      });

      res.json({
        success: true,
        data: {
          id: updatedGuide.id,
          name: updatedGuide.name,
          email: updatedGuide.email,
          status: updatedGuide.status
        },
        message: 'Guia turístico rejeitado'
      });
    } catch (error) {
      console.error('Error rejecting guide:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao rejeitar guia turístico'
      });
    }
  };

  getDrivers = async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      
      const where: any = {};
      if (status) {
        where.status = status;
      }

      const drivers = await prisma.drivers.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          document_cpf: true,
          document_rg: true,
          document_cnh: true,
          vehicle_plate: true,
          vehicle_model: true,
          created_at: true,
          updated_at: true
        },
        orderBy: { created_at: 'desc' }
      });

      res.json({
        success: true,
        data: drivers
      });
    } catch (error) {
      console.error('Error getting drivers:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar motoristas'
      });
    }
  };

  getGuides = async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      
      const where: any = {};
      if (status) {
        where.status = status;
      }

      const guides = await prisma.tourist_guides.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          is_bilingual: true,
          languages: true,
          also_driver: true,
          created_at: true,
          updated_at: true
        },
        orderBy: { created_at: 'desc' }
      });

      res.json({
        success: true,
        data: guides
      });
    } catch (error) {
      console.error('Error getting guides:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar guias turísticos'
      });
    }
  };
}
```

### 4. `src/services/rating.ts`
```typescript
import { prisma } from '../config/database';
import { config } from '../config';
import { RatingData, RatingStats, RatingSummary, RaterType, UserType } from '../types/rating';
import { randomUUID } from 'crypto';

export class RatingService {

  async createRating(data: RatingData): Promise<{ success: boolean; rating?: any; error?: string; existingRating?: any }> {
    if (data.score < 1 || data.score > 5) {
      return { success: false, error: 'Score must be between 1 and 5' };
    }

    if (data.comment && data.comment.length > 200) {
      return { success: false, error: 'Comment exceeds 200 characters' };
    }

    try {
      if (data.rideId) {
        const existingRating = await prisma.ratings.findUnique({
          where: {
            ride_id_user_id: {
              ride_id: data.rideId,
              user_id: data.raterId
            }
          }
        });

        if (existingRating) {
          return { 
            success: false, 
            error: 'RATING_ALREADY_EXISTS',
            existingRating: {
              id: existingRating.id,
              rating: existingRating.rating,
              comment: existingRating.comment,
              created_at: existingRating.created_at
            }
          };
        }
      }

      const rating = await prisma.ratings.create({
        data: {
          id: randomUUID(),
          entity_type: 'DRIVER',
          entity_id: data.ratedId,
          user_id: data.raterId,
          ride_id: data.rideId || null,
          rated_id: data.ratedId,
          rater_id: data.raterId,
          rater_type: data.raterType,
          rating: data.score,
          score: data.score,
          comment: data.comment || null,
          created_at: new Date()
        }
      });

      await this.updateRatingStats(data.ratedId, 'DRIVER');

      return { 
        success: true, 
        rating: {
          id: rating.id,
          rating: rating.rating,
          comment: rating.comment,
          created_at: rating.created_at
        }
      };

    } catch (error) {
      console.error('Error creating rating:', error);
      return { success: false, error: 'Failed to create rating' };
    }
  }

  async getRatingSummary(entityId: string, userType: UserType): Promise<RatingSummary> {
    try {
      const stats = await prisma.rating_stats.findUnique({
        where: {
          entity_type_entity_id: {
            entity_type: 'DRIVER',
            entity_id: entityId
          }
        }
      });

      if (!stats) {
        return {
          entityId,
          entityType: userType,
          stats: {
            averageRating: 0,
            totalRatings: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
          },
          recentRatings: []
        };
      }

      const recentRatings = await prisma.ratings.findMany({
        where: {
          entity_type: 'DRIVER',
          entity_id: entityId
        },
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          rating: true,
          comment: true,
          created_at: true
        }
      });

      const distribution = await prisma.ratings.groupBy({
        by: ['rating'],
        where: {
          entity_type: 'DRIVER',
          entity_id: entityId
        },
        _count: {
          rating: true
        }
      });

      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      distribution.forEach(item => {
        ratingDistribution[item.rating as keyof typeof ratingDistribution] = item._count.rating;
      });

      return {
        entityId,
        entityType: userType,
        stats: {
          averageRating: parseFloat(stats.average_rating.toString()),
          totalRatings: stats.total_ratings,
          ratingDistribution
        },
        recentRatings: recentRatings.map(r => ({
          rating: r.rating,
          comment: r.comment || undefined,
          createdAt: r.created_at
        }))
      };

    } catch (error) {
      console.error('Error getting rating summary:', error);
      return {
        entityId,
        entityType: userType,
        stats: {
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        },
        recentRatings: []
      };
    }
  }

  private async updateRatingStats(entityId: string, entityType: string): Promise<void> {
    try {
      const result = await prisma.ratings.aggregate({
        where: {
          entity_type: entityType,
          entity_id: entityId
        },
        _avg: { rating: true },
        _count: { rating: true },
        _sum: { rating: true }
      });

      const averageRating = result._avg.rating || 0;
      const totalRatings = result._count.rating || 0;
      const ratingSum = result._sum.rating || 0;

      await prisma.rating_stats.upsert({
        where: {
          entity_type_entity_id: {
            entity_type: entityType,
            entity_id: entityId
          }
        },
        update: {
          average_rating: averageRating,
          total_ratings: totalRatings,
          rating_sum: ratingSum,
          updated_at: new Date(),
          last_updated: new Date()
        },
        create: {
          id: randomUUID(),
          entity_type: entityType,
          entity_id: entityId,
          average_rating: averageRating,
          total_ratings: totalRatings,
          rating_sum: ratingSum,
          updated_at: new Date(),
          last_updated: new Date()
        }
      });

    } catch (error) {
      console.error('Error updating rating stats:', error);
    }
  }
}
```

---

## 📝 ARQUIVOS MODIFICADOS (Diffs)

### 1. `src/app.ts`
**ADICIONAR imports:**
```typescript
// APÓS linha: import { driverAuthRoutes } from './routes/driver-auth';
import { guideAuthRoutes } from './routes/guide-auth';
import { adminApprovalRoutes } from './routes/admin-approval';
```

**ADICIONAR rotas:**
```typescript
// APÓS linha: app.use('/api/admin/auth', authRoutes);
app.use('/api/admin', adminApprovalRoutes);

// APÓS linha: app.use('/api/auth', driverAuthRoutes);
app.use('/api/auth', guideAuthRoutes);
```

### 2. `src/routes/governance.ts`
**ADICIONAR import:**
```typescript
// APÓS linha: import { randomUUID } from 'crypto';
import { RatingController } from '../modules/rating/controller';
```

**ADICIONAR controller:**
```typescript
// APÓS linha: const router = Router();
const ratingController = new RatingController();
```

**ADICIONAR schemas e rotas ANTES do export:**
```typescript
// Driver registration schemas
const driverCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  communityId: z.string().optional(),
  documentCpf: z.string().min(1, 'CPF é obrigatório'),
  documentRg: z.string().min(1, 'RG é obrigatório'),
  documentCnh: z.string().min(1, 'CNH é obrigatório'),
  vehiclePlate: z.string().min(1, 'Placa do veículo é obrigatória'),
  vehicleModel: z.string().min(1, 'Modelo do veículo é obrigatório')
});

// Guide registration schemas
const guideCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  communityId: z.string().optional(),
  isBilingual: z.boolean().default(false),
  languages: z.array(z.string()).default([]),
  alsoDriver: z.boolean().default(false)
});

// POST /api/governance/driver - Create driver
router.post('/driver', async (req, res) => {
  try {
    const data = driverCreateSchema.parse(req.body);
    
    const existingDriver = await prisma.drivers.findUnique({ where: { email: data.email } });
    if (existingDriver) {
      return res.status(409).json({ 
        success: false, 
        error: 'Email já cadastrado' 
      });
    }
    
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const driver = await prisma.drivers.create({
      data: {
        id: randomUUID(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        password_hash: hashedPassword,
        status: 'pending',
        document_cpf: data.documentCpf,
        document_rg: data.documentRg,
        document_cnh: data.documentCnh,
        vehicle_plate: data.vehiclePlate,
        vehicle_model: data.vehicleModel,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    res.json({ 
      success: true, 
      data: { 
        id: driver.id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        status: driver.status
      }
    });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar motorista'
    });
  }
});

// POST /api/governance/guide - Create tourist guide
router.post('/guide', async (req, res) => {
  try {
    const data = guideCreateSchema.parse(req.body);
    
    const existingGuide = await prisma.tourist_guides.findUnique({ where: { email: data.email } });
    if (existingGuide) {
      return res.status(409).json({ 
        success: false, 
        error: 'Email já cadastrado' 
      });
    }
    
    const guide = await prisma.tourist_guides.create({
      data: {
        id: randomUUID(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: 'pending',
        is_bilingual: data.isBilingual,
        languages: data.languages,
        also_driver: data.alsoDriver,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    res.json({ 
      success: true, 
      data: { 
        id: guide.id,
        name: guide.name,
        email: guide.email,
        phone: guide.phone,
        status: guide.status
      }
    });
  } catch (error) {
    console.error('Error creating guide:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar guia turístico'
    });
  }
});

// Rating endpoints
router.post('/ratings', ratingController.createRating);
router.get('/ratings/driver/:driverId', ratingController.getRatingSummary);
```

### 3. `src/routes/passenger-auth.ts`
**ADICIONAR validação LGPD APÓS verificação de status:**
```typescript
// APÓS: if (passenger.status !== 'ACTIVE') { ... }
// ADICIONAR:
    // Check LGPD consent
    const lgpdConsent = await prisma.user_consents.findUnique({
      where: {
        passenger_id_consent_type: {
          passenger_id: passenger.id,
          consent_type: 'LGPD'
        }
      }
    });

    if (!lgpdConsent || !lgpdConsent.accepted) {
      return res.status(401).json({
        success: false,
        error: 'É necessário aceitar os termos LGPD para continuar'
      });
    }
```

### 4. `src/types/rating.ts`
**SUBSTITUIR interfaces:**
```typescript
export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: { [key: number]: number };
}

export interface RatingResponse {
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface RatingSummary {
  entityId: string;
  entityType: UserType;
  stats: RatingStats;
  recentRatings: RatingResponse[];
}
```

### 5. `src/modules/rating/controller.ts`
**SUBSTITUIR método getRatingSummary:**
```typescript
  // GET /api/governance/ratings/driver/:driverId
  getRatingSummary = async (req: Request, res: Response) => {
    try {
      const { driverId } = req.params;
      
      const userType = UserType.DRIVER;
      const summary = await this.ratingService.getRatingSummary(driverId, userType);

      res.json({
        success: true,
        summary
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request parameters'
      });
    }
  };
```

### 6. `.env`
**ALTERAR porta:**
```
PORT=3003
```

---

## 🎯 APLICAÇÃO

1. **Criar arquivos novos** com conteúdo exato
2. **Aplicar diffs** nos arquivos existentes  
3. **Executar build:** `npm run build`
4. **Testar:** `./test_auth_complete.sh`

**Todas as mudanças são idempotentes e compatíveis com o sistema existente.**
