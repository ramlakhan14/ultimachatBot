import React from 'react'
import {
    Box,
    Flex,
    Heading,
    SimpleGrid,
    Text
} from '@chakra-ui/react'
import { User } from '../../services/appConfig'
import { DiscoutData, SubscriptionTier, SubscriptionType, activeSubscriptionId } from '../../types/subscription.type'
import { PricingCard } from './PricingCard'

type openAiKey = {
    apiKey: string;
    useOwnKey: boolean;
}
type FreeComponentProps = {
    currentSubscription: User['subscriptionData'] | null;
    discountData?: DiscoutData
    userEmail: string;
    activeSubscriptionId: activeSubscriptionId;
    openAiKey: openAiKey;
}

export const FreeComponent = ({ currentSubscription, discountData, userEmail, activeSubscriptionId, openAiKey }: FreeComponentProps) => {
    const [subscriptionTier, setSubscriptionTier] = React.useState<SubscriptionTier>('MONTHLY');

    const isCurrentPlan = React.useCallback((type: SubscriptionType) => {
        return currentSubscription?.name === type;
    }, [currentSubscription]);

    const isUseOwnKey = React.useCallback(() => {
        return openAiKey?.useOwnKey === false;
    }, [openAiKey]);


    // const onChangeTier = React.useCallback(
    //     (tier: number) => {
    //         if (tier === 0) {
    //             setSubscriptionTier('MONTHLY');
    //         } else {
    //             setSubscriptionTier('YEARLY');
    //         }
    //     }, []
    // );

    const getLTDPricingCrrd = React.useCallback((type: activeSubscriptionId) => {
        if (type === 'APPSUMO_TIER1') {
            return <PricingCard
                showPricingBtn={false}
                tier={'LIFETIME'}
                subscriptionData={{
                    type: 'AppSumo tier 1',
                    pageCount: 2000,
                    tokenSize: '1M',
                    projectCount: 20
                }}
                discountData={discountData}
                isCurrentSubscription={isCurrentPlan('Starter')}
                userEmail={userEmail}
            />
        } else if (type === 'APPSUMO_TIER2') {
            return <PricingCard
                showPricingBtn={false}
                tier={'LIFETIME'}
                subscriptionData={{
                    type: 'AppSumo tier 2',
                    pageCount: 5000,
                    tokenSize: '2.5M',
                    projectCount: 50
                }}
                discountData={discountData}
                isCurrentSubscription={isCurrentPlan('Starter')}
                userEmail={userEmail}
            />
        } else if (type === 'APPSUMO_TIER3') {
            return <PricingCard
                showPricingBtn={false}
                tier={'LIFETIME'}
                subscriptionData={{
                    type: 'AppSumo tier 3',
                    pageCount: 10000,
                    tokenSize: '5M',
                    projectCount: 'unlimited'
                }}
                discountData={discountData}
                isCurrentSubscription={isCurrentPlan('Starter')}
                userEmail={userEmail}
            />
        }
    }, [discountData, isCurrentPlan, userEmail]);

    const getPricingBlockLTD = React.useCallback(() => {
        // if (currentSubscription?.type === 'LIFETIME') {
        return <Box minW="100%" p="24px" backgroundColor="white" boxShadow="sm" borderRadius="8px" mb="6">
            <Flex direction="column" alignItems="center">
                <Heading as='h5' size='18px' color="#2977FF">
                    Current plan
                </Heading>
                <Text textAlign="center" color="#6C757D" fontSize="sm" mt="8px" fontWeight="400">
                    {/* You are on a {currentSubscription?.name?.charAt(0)?.toUpperCase() + currentSubscription?.name?.slice(1).toLowerCase()} {currentSubscription?.type?.charAt(0).toUpperCase() + currentSubscription?.type?.slice(1).toLowerCase()} */}
                </Text>
                <Flex direction="column" maxW="300px" minW={"300px"}>
                    {getLTDPricingCrrd(activeSubscriptionId)}
                </Flex>
            </Flex>
        </Box>
        // }


    }, [activeSubscriptionId, currentSubscription?.type, getLTDPricingCrrd]);



    return (
        <>

            {
                getPricingBlockLTD()
            }
            <Box minW="100%" p={8} pt={12} pb={1} backgroundColor="white" boxShadow="sm" borderRadius="8px">
                <Flex justify="center" mb={12}>
                    <Flex
                        direction="column"
                        align="center"
                        maxW="xl"
                    >
                        <Heading as='h5' size='18px' color="#1A202C" mb="8px">
                            Pricing
                        </Heading>
                        <Text textAlign="center" color="#6C757D" fontSize="sm" mt="8px" fontWeight="400">
                            UltimaBot is free and open source, but you can choose the cloud-based solution where we handle everything from hosting to support.
                        </Text>

                    </Flex>
                </Flex>
                <Text as='span'>
                    <SimpleGrid columns={[1, 1, 1, 3]} spacing="6" templateColumns={{ lg: "repeat(3, minmax(0, 1fr))", sm: "repeat(1, minmax(0, 1fr))", md: "repeat(2, minmax(0, 1fr))" }}>

                        {/* <PricingCard
                            tier={subscriptionTier}
                            subscriptionData={{
                                type: 'Standard',
                                pageCount: 1000,
                                tokenSize: '1M',
                                projectCount: 1
                            }}
                            discountData={discountData}
                            isCurrentSubscription={isCurrentPlan('Standard') && isUseOwnKey()}
                            userEmail={userEmail}
                        />
                        <PricingCard
                            tier={subscriptionTier}
                            subscriptionData={{
                                type: 'Premium',
                                pageCount: 2500,
                                tokenSize: '2.5M',
                                projectCount: 3
                            }}
                            discountData={discountData}
                            isCurrentSubscription={isCurrentPlan('Premium') && isUseOwnKey()}
                            userEmail={userEmail}
                            isPopular
                        />
                        <PricingCard
                            tier={subscriptionTier}
                            subscriptionData={{
                                type: 'Enterprise',
                                pageCount: 10000,
                                tokenSize: '10M',
                                projectCount: "Unlimited"
                            }}
                            discountData={discountData}
                            isCurrentSubscription={isCurrentPlan('Enterprise') && isUseOwnKey()}
                            userEmail={userEmail}
                        /> */}
                    </SimpleGrid>
                </Text>
                <Flex
                    mt={8}
                    mb={12}
                    w="100%"
                    justifyContent="center"
                >

                </Flex>
            </Box>
        </>
    )
}