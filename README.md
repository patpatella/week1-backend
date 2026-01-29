## Refactoring an Express File to NestJS

This project demonstrates the refactoring of an Express.js file into a NestJS application following clean architecture and production-ready backend practices.

The goal of this refactor was not to change features, but to improve structure, type safety, maintainability, and scalability by introducing clear separation of concerns and leveraging NestJS’s architectural patterns.

## This is the original Express Structure....before refactoring


import { Response } from 'express';
import { TypedRequest } from '../types/TypedRequest';
import { Prisma, JobStatus } from '@prisma/client';
import prisma from '../prismaClient';
export const postJob = async (req: TypedRequest, res: Response) => {
  try {
    const { title, description, category, location, suggestedPrice } = req.body;

    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const normalizedCategory = category?.toLowerCase() || 'general';

    const job = await prisma.job.create({
      data: {
        posterId: req.userId,
        title,
        description,
        category: normalizedCategory,
        suggestedPrice,
        locationLat: location?.lat ?? null,
        locationLon: location?.lon ?? null,
        locationAddress: location?.address ?? null,
        status: JobStatus.open,
      },
    });

    const room = `doer:${normalizedCategory}`;
    console.log(`📢 Emitting job:new to room ${room}`);

    req.io?.to(room).emit('job:new', {
      jobId: job.id,
      title: job.title,
      category: job.category,
      location: {
        lat: job.locationLat,
        lon: job.locationLon,
        address: job.locationAddress,
      },
      suggestedPrice: job.suggestedPrice,
    });

    return res.status(201).json({ jobId: job.id });
  } catch (err) {
    console.error('postJob error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const closeJob = async (req: TypedRequest, res: Response) => {
  try {
    const { jobId } = req.body;

    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.job.updateMany({
        where: {
          id: jobId,
          posterId: req.userId,
          status: JobStatus.open,
        },
        data: { status: JobStatus.completed },
      });
      return updated.count > 0;
    });

    if (!result) {
      return res.status(404).json({ error: 'Job not found or not open' });
    }

    req.io?.to(`doer:*`).emit('job:closed', { jobId });

    return res.json({ success: true });
  } catch (err) {
    console.error('closeJob error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};


## Problems I noticed:

* Controllers handled HTTP logic, business logic, and database access
* req and res objects were passed deep into the application
* Prisma was accessed directly inside route handlers
* Error handling and validation were inconsistent

The application was restructured into a layered architecture:

src/
 ├── jobs/
 │   ├── jobs.controller.ts
 │   ├── jobs.service.ts
 │   ├── jobs.repository.ts
 │   ├── dto/
 │   │   └── create-job.dto.ts
 │   └── jobs.module.ts
 ├── prisma/
 │   └── prisma.service.ts
 ├── auth/
 │   ├── auth.guard.ts
 │   └── current-user.decorator.ts
 └── main.ts


Database connections

Cross-cutting concerns
