import { Box, Button, Flex, Heading, Select, Spinner, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { fetchAllNotifications, updateNotifications } from '../../../services/emailassistantservice';
import { useHistory } from 'react-router-dom';

const Notification = () => {
  const [isFetching, setIsFetching] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [notificationData, setNotificationData] = React.useState<any>([]);
  const [notificationType, setNotificationType] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);
  const [hasMore, setHasMore] = React.useState<boolean>(true);
  const pageSize = 10;

  const history = useHistory();

  async function fetchNotification(reset = false) {
    try {
      if (reset) {
        setIsFetching(true);
        setPage(1);
      } else {
        setIsLoadingMore(true);
      }

      const currentPage = reset ? 1 : page;
      const response: any = await fetchAllNotifications(notificationType, currentPage, pageSize);
      // console.log(response, 'response');

      // If no results or fewer results than pageSize, we've reached the end
      if (!response?.data?.notifications || response?.data?.notifications?.length < pageSize) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      // If resetting, replace the data, otherwise append
      if (reset) {
        setNotificationData(response?.data?.notifications);
      } else {
        setNotificationData((prev: any) => [...prev, ...response?.data?.notifications]);
      }
    } catch (error) {
      // console.error("Error fetching notifications:", error);
    } finally {
      setIsFetching(false);
      setIsLoadingMore(false);
    }
  }

  React.useEffect(() => {
    fetchNotification(true); // Reset and fetch when notification type changes
  }, [notificationType]);

  function loadMore() {
    setPage(prevPage => prevPage + 1);
  }

  React.useEffect(() => {
    if (page > 1) {
      fetchNotification(false); // Load more without resetting
    }
  }, [page]);

  function formatNotificationType(type: string) {
    return type
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function timeAgo(timestamp: any) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    const timeIntervals = [
      { label: "year", seconds: 31536000 },
      { label: "week", seconds: 604800 },
      { label: "day", seconds: 86400 },
      { label: "hour", seconds: 3600 },
      { label: "minute", seconds: 60 },
      { label: "second", seconds: 1 },
    ];

    for (const interval of timeIntervals) {
      const count = Math.floor(diffInSeconds / interval.seconds);
      if (count >= 1) {
        return `${count}${interval.label.charAt(0)} ago`;
      }
    }

    return "Just now";
  }

  if (isFetching) {
    return (<Spinner position='absolute' top='50%' left='50%' transform="translate(-50%, -50%)" />);
  }

  return (
    <Box
      w="100%"
      p="6"
      shadow="sm"
      h="100%"
      position="relative"
      overflow="auto"
    >
      <Box maxW='775px' m='auto'>
        <VStack w="100%" spacing="10">
          <Flex
            shrink={0}
            w="100%"
            direction="column"
            justifyContent="space-between"
          >
            <Flex width="100%" mb="8" justifyContent="space-between" alignItems="center">
              <Box>
                <Heading fontSize="24px" color="#1A202C">Notifications</Heading>
              </Box>
              <Box>
                <Select bg='#fff' width={"200px"} border="1px solid #CED4DA" onChange={(e) => setNotificationType(e.target.value)} value={notificationType}>
                  <option value="">All</option>
                  <option value="manual_approval">Manual Approval</option>
                  <option value="follow_up">Follow-up</option>
                </Select>
              </Box>
            </Flex>
          </Flex>
        </VStack>
        <Box w='100%' boxShadow="0px 1px 4px 0px #0C0C0D0D" border="1px solid #E2E8F0" p='12px' bg='#fff' borderRadius="8px" lineHeight='26px'>
          {notificationData?.length === 0 ? (
            <Box textAlign="center" py={6}>
              <Text fontSize="16px" color="#6C757D">No notifications found</Text>
            </Box>
          ) : (
            <>
              {notificationData && notificationData.map((notification: any, index: number) => (
                <Box
                  key={notification._id || index}
                  role='button'
                  pos='relative'
                  display='flex'
                  justifyContent='space-between'
                  gap={4}
                  alignItems='center'
                  borderBottom='1px solid #EAF1FF'
                  bg={notification?.isSeen === false ? '#EAF1FF' : ''}
                  px={3}
                  py={'10px'}
                  onClick={() => {
                    updateNotifications({ notificationId: notification?._id })
                      .then(() => {
                        fetchNotification(true);
                        if (notification?.notificationType === 'manual_approval') {
                          history.push(`/app/email-conversation/67a19ff55bf38c35e2c40931/draft`);
                        } else {
                          history.push(`/app/email-conversation/67a1a01a5bf38c35e2c40933/followup-conversations`);
                        }
                      })
                  }}
                >
                  <Box display='flex' gap={4} alignItems='center'>
                    {notification?.isSeen === false ? <Box h='8px' w='8px' borderRadius='50%' bg='#2977FF' /> : <Box h='8px' w='8px' borderRadius='50%' bg='#fff' />}
                    <Box>
                      <Text fontSize="16px" color="#1A202C" fontWeight={400}>{notification?.audienceEmailId}</Text>
                      <Text fontSize="14px" color="#6C757D">{timeAgo(notification?.createdAt)}</Text>
                    </Box>
                  </Box>
                  <Box bg='#F8F9FA' fontSize="14px" px={'8px'} py={'6px'} borderRadius='3px'>
                    {formatNotificationType(notification?.notificationType) === 'Follow Up' ? 'Follow-up' : formatNotificationType(notification?.notificationType)}
                  </Box>
                </Box>
              ))}

              {/* See More Button */}
              {hasMore && (
                <Box textAlign="center" pt={3}>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering parent onClick
                      loadMore();
                    }}
                    isLoading={isLoadingMore}
                    loadingText="Loading..."
                    color="#2977FF"
                    variant="outline"
                    fontWeight={500}
                  >
                    See More
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Notification;