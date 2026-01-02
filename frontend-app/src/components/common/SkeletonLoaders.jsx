import { Box, Card, CardContent, Skeleton } from "@mui/material";

export const RideCardSkeleton = () => (
  <Card sx={{ mb: 3 }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Skeleton variant="circular" width={24} height={24} sx={{ mr: 2 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" width="60%" height={28} />
          <Skeleton variant="text" width="40%" height={20} />
        </Box>
        <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 2 }} />
      </Box>
      
      <Skeleton variant="rectangular" width="100%" height={8} sx={{ mb: 2, borderRadius: 1 }} />
      
      <Box sx={{ mb: 2 }}>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="70%" />
      </Box>
      
      <Box sx={{ 
        p: 2, 
        bgcolor: 'grey.50', 
        borderRadius: 2,
        mb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="text" width="70%" />
          </Box>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Skeleton variant="rectangular" width="30%" height={40} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width="70%" height={40} sx={{ borderRadius: 1 }} />
      </Box>
    </CardContent>
  </Card>
);

export const DashboardCardSkeleton = () => (
  <Card>
    <CardContent sx={{ textAlign: 'center', py: 3 }}>
      <Skeleton variant="circular" width={40} height={40} sx={{ mx: 'auto', mb: 2 }} />
      <Skeleton variant="text" width="60%" height={24} sx={{ mx: 'auto', mb: 1 }} />
      <Skeleton variant="text" width="80%" height={20} sx={{ mx: 'auto', mb: 2 }} />
      <Skeleton variant="rectangular" width="70%" height={36} sx={{ mx: 'auto', borderRadius: 1 }} />
    </CardContent>
  </Card>
);

export const EarningsListSkeleton = () => (
  <Box>
    {[...Array(5)].map((_, index) => (
      <Box key={index} sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
        <Skeleton variant="circular" width={24} height={24} sx={{ mr: 2 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="60%" />
        </Box>
        <Skeleton variant="text" width="20%" />
      </Box>
    ))}
  </Box>
);

export const StatusCardSkeleton = () => (
  <Card sx={{ mb: 3 }}>
    <CardContent sx={{ textAlign: 'center', py: 4 }}>
      <Skeleton variant="circular" width={64} height={64} sx={{ mx: 'auto', mb: 2 }} />
      <Skeleton variant="text" width="50%" height={32} sx={{ mx: 'auto', mb: 1 }} />
      <Skeleton variant="text" width="70%" height={20} sx={{ mx: 'auto', mb: 3 }} />
      <Skeleton variant="rectangular" width="60%" height={40} sx={{ mx: 'auto', borderRadius: 2 }} />
    </CardContent>
  </Card>
);
