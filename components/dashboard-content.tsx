'use client';

import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/data-state';
import { AnimatedButton } from '@/components/ui/animated-button';
import { AnimatedCard } from '@/components/ui/animated-card';
import { Progress } from '@/components/ui/progress';
import { Plus, Clock, Flame, Calendar, TrendingUp } from 'lucide-react';
import { useBoxPlannerStore } from '@/lib/store';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { AppModal } from '@/components/app-modal';
import { TrainingForm } from '@/components/training-form';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useActiveOrganization } from '@/components/providers/organization-provider';
import { StudentDashboardContent } from '@/components/student-dashboard-content';
import { isViewerOrganization } from '@/lib/organization-role';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

const categoryLabelKeys = {
  'warm-up': 'blockCategories.warmUp',
  technique: 'blockCategories.technique',
  cardio: 'blockCategories.cardio',
  strength: 'blockCategories.strength',
  cooldown: 'blockCategories.cooldown',
  sparring: 'blockCategories.sparring',
} as const;

export function DashboardContent() {
  const { stats, blocks, openModal } = useBoxPlannerStore();
  const { t } = useAppTranslation();
  const { activeOrganization, loading } = useActiveOrganization();

  const progressPercentage =
    (stats.weeklyProgressMinutes / stats.weeklyGoalMinutes) * 100;

  if (loading || !activeOrganization) {
    return (
      <LoadingState
        title="cargando inicio"
        description="estamos preparando tu organizacion activa."
        className="min-h-[420px]"
      />
    );
  }

  if (isViewerOrganization(activeOrganization)) {
    return <StudentDashboardContent />;
  }

  return (
    <>
      <div className='space-y-8'>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='space-y-4'
        >
          <div>
            <h1 className='text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl'>
              {t('dashboard.title')}
            </h1>
            <p className='mt-2 text-lg text-muted-foreground'>
              {t('dashboard.subtitle')}
            </p>
          </div>

          <AnimatedButton size='lg' className='gap-2' onClick={openModal}>
            <Plus className='h-5 w-5' />
            {t('dashboard.createTraining')}
          </AnimatedButton>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate='visible'
          className='grid gap-4 md:grid-cols-3'
        >
          <motion.div variants={itemVariants}>
            <Card className='p-6'>
              <div className='flex items-center gap-4'>
                <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10'>
                  <Calendar className='h-6 w-6 text-primary' />
                </div>
                <div>
                  <p className='text-sm text-muted-foreground'>
                    {t('dashboard.thisMonth')}
                  </p>
                  <p className='text-3xl font-bold text-foreground'>
                    {stats.trainingsThisMonth}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {t('dashboard.trainings')}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className='p-6'>
              <div className='flex items-center gap-4'>
                <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/20'>
                  <Clock className='h-6 w-6 text-chart-2' />
                </div>
                <div>
                  <p className='text-sm text-muted-foreground'>
                    {t('dashboard.totalTime')}
                  </p>
                  <p className='text-3xl font-bold text-foreground'>
                    {Math.floor(stats.totalTimeMinutes / 60)}h{' '}
                    {stats.totalTimeMinutes % 60}m
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {t('dashboard.trainingTime')}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className='p-6'>
              <div className='flex items-center gap-4'>
                <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-chart-5/20'>
                  <Flame className='h-6 w-6 text-chart-5' />
                </div>
                <div>
                  <p className='text-sm text-muted-foreground'>
                    {t('dashboard.currentStreak')}
                  </p>
                  <p className='text-3xl font-bold text-foreground'>
                    {stats.currentStreak}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {t('dashboard.consecutiveDays')}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className='p-6'>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10'>
                    <TrendingUp className='h-5 w-5 text-primary' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-foreground'>
                      {t('dashboard.weeklyGoal')}
                    </h3>
                    <p className='text-sm text-muted-foreground'>
                      {stats.weeklyProgressMinutes} / {stats.weeklyGoalMinutes}{' '}
                      {t('dashboard.minutes')}
                    </p>
                  </div>
                </div>
                <span className='text-2xl font-bold text-primary'>
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress value={progressPercentage} className='h-3' />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className='space-y-4'
        >
          <div className='flex items-center justify-between'>
            <h2 className='text-2xl font-bold text-foreground'>
              {t('dashboard.recentBlocks')}
            </h2>
            <Link href='/blocks'>
              <AnimatedButton variant='outline' size='sm'>
                {t('dashboard.viewAll')}
              </AnimatedButton>
            </Link>
          </div>

          <div className='grid gap-4 md:grid-cols-3'>
            {blocks.slice(0, 3).map((block) => (
              <AnimatedCard key={block.id} className='p-6'>
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <span className='rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary'>
                      {t(categoryLabelKeys[block.category])}
                    </span>
                    <span className='text-sm text-muted-foreground'>
                      {block.duration} min
                    </span>
                  </div>
                  <h3 className='font-semibold text-foreground'>
                    {block.name}
                  </h3>
                  <p className='text-sm text-muted-foreground line-clamp-2'>
                    {block.description}
                  </p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </motion.div>
      </div>

      <AppModal title={t('dashboard.newTrainingTitle')}>
        <TrainingForm />
      </AppModal>
    </>
  );
}
