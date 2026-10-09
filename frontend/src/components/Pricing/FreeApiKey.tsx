import React from 'react'
import {
    Badge,
    Box,
    Button,
    Flex,
    Heading,
    HStack,
    SimpleGrid,
    Text,
    VStack
} from '@chakra-ui/react'
import { User } from '../../services/appConfig'
import { DiscoutData, SubscriptionTier, SubscriptionType, activeSubscriptionId } from '../../types/subscription.type'
import { PricingCard } from './PricingCard'
import { FaBriefcase, FaCrown, FaGem, FaRocket } from 'react-icons/fa'
// import { PricingApiCard } from './PricingApiCard'

type openAiKey = {
    apiKey: string;
    useOwnKey: boolean;
}
type FreeComponentProps = {
    currentSubscription: any;
    // currentSubscription: User["subscriptionData"];
    discountData?: DiscoutData
    userEmail: string;
    activeSubscriptionId: activeSubscriptionId;
    openAiKey: openAiKey;
}


export const FreeApiKey = ({ currentSubscription, discountData, userEmail, activeSubscriptionId, openAiKey }: FreeComponentProps) => {
    const [subscriptionTier, setSubscriptionTier] = React.useState<SubscriptionTier>('MONTHLY');
    // const [userEmail, setUserEmail] = React.useState<any>(null);
    const [show, setShow] = React.useState(false);
    const [isYearly, setIsYearly] = React.useState(false);

    // const isCurrentPlan = React.useCallback((type: SubscriptionType) => {
    //     return currentSubscription?.name === type;
    // }, [currentSubscription]);

    // const isUseOwnKey = React.useCallback(() => {
    //     return openAiKey?.useOwnKey === true;
    // }, [openAiKey]);


    // const getLTDPricingCrrd = React.useCallback((type: activeSubscriptionId) => {
    //     if (type === 'APPSUMO_TIER1') {
    //         return <PricingCard
    //             showPricingBtn={false}
    //             tier={'LIFETIME'}
    //             subscriptionData={{
    //                 type: 'AppSumo tier 1',
    //                 pageCount: 2000,
    //                 tokenSize: '1M',
    //                 projectCount: 20
    //             }}
    //             discountData={discountData}
    //             isCurrentSubscription={isCurrentPlan('Base')}
    //             userEmail={userEmail}
    //         />
    //     } else if (type === 'APPSUMO_TIER2') {
    //         return <PricingCard
    //             showPricingBtn={false}
    //             tier={'LIFETIME'}
    //             subscriptionData={{
    //                 type: 'AppSumo tier 2',
    //                 pageCount: 5000,
    //                 tokenSize: '2.5M',
    //                 projectCount: 50
    //             }}
    //             discountData={discountData}
    //             isCurrentSubscription={isCurrentPlan('Base')}
    //             userEmail={userEmail}
    //         />
    //     } else if (type === 'APPSUMO_TIER3') {
    //         return <PricingCard
    //             showPricingBtn={false}
    //             tier={'LIFETIME'}
    //             subscriptionData={{
    //                 type: 'AppSumo tier 3',
    //                 pageCount: 10000,
    //                 tokenSize: '5M',
    //                 projectCount: 'unlimited'
    //             }}
    //             discountData={discountData}
    //             isCurrentSubscription={isCurrentPlan('Base')}
    //             userEmail={userEmail}
    //         />
    //     }
    // }, [discountData, isCurrentPlan, userEmail]);

    // const getPricingBlockLTD = React.useCallback(() => {
    //     if (currentSubscription?.type === 'LIFETIME') {
    //         return <Box minW="100%" p="24px" backgroundColor="white" boxShadow="sm" borderRadius="8px" mb="6">
    //             <Flex direction="column" alignItems="center">
    //                 <Heading as='h5' size='sm' color="#2977FF">
    //                     Current plan
    //                 </Heading>
    //                 <Text textAlign="center" color="#6C757D" fontSize="sm" mt="8px" fontWeight="400">
    //                     You are on a lifetime plan purchased from AppSumo.
    //                 </Text>
    //                 <Flex direction="column" maxW="300px" minW={"300px"}>
    //                     {getLTDPricingCrrd(activeSubscriptionId)}
    //                 </Flex>
    //             </Flex>
    //         </Box>
    //     }
    //     return null

    // }, [activeSubscriptionId, currentSubscription?.type, getLTDPricingCrrd]);

    const plans = [
        {
            title: "Starter",
            price: isYearly ? "470" : "49",
            type: isYearly ? "yearly" : "monthly",
            saveUpto: "118",
            yearlyFullPrice: "588",
            userEmail: userEmail,
            botLimit: "5 Chatbot",
            bonusCredits: "1,000",
            description: "For freelancers or small business",
            icon: FaRocket,
            features: ["ChatBot", "Email Assistant", "Inbound VoiceBot", "Email Outreach", "Outbound VoiceBot"]
        },
        {
            title: "Pro",
            userEmail: userEmail,
            price: isYearly ? "950" : "99",
            type: isYearly ? "yearly" : "monthly",
            saveUpto: "238",
            yearlyFullPrice: "1188",
            botLimit: "10 Chatbot",
            bonusCredits: "2,500",
            isPopular: true,
            description: "Best for teams running multi-channel campaigns.",
            icon: FaCrown,
            features: ["ChatBot", "Email Assistant", "Inbound VoiceBot", "Email Outreach", "Outbound VoiceBot"]
        },
        {
            title: "Agency",
            userEmail: userEmail,
            price: isYearly ? "1430" : "149",
            type: isYearly ? "yearly" : "monthly",
            botLimit: "20 Chatbot",
            saveUpto: "358",
            yearlyFullPrice: "1788",
            bonusCredits: "3,500",
            description: "For agencies managing multiple clients & campaigns.",
            icon: FaBriefcase,
            features: ["ChatBot", "Email Assistant", "Inbound VoiceBot", "Email Outreach", "Outbound VoiceBot"]
        },
        {
            title: "Ultimate",
            userEmail: userEmail,
            price: isYearly ? "2870" : "299",
            type: isYearly ? "yearly" : "month",
            saveUpto: "718",
            yearlyFullPrice: "3588",
            botLimit: "Unlimited Chatbot",
            bonusCredits: "5,000",
            description: "For heavy volume users, SaaS founders & enterprise workloads.",
            icon: FaGem,
            features: ["ChatBot", "Email Assistant", "Inbound VoiceBot", "Email Outreach", "Outbound VoiceBot"]
        }
    ];



    return (
        <>
            <Box minW="100%" p={8} pt={12} pb={1} backgroundColor="white" boxShadow="sm" borderRadius="8px">
                <Box textAlign={"center"} mb={12}>
                    {/* <Flex
                        direction="column"
                        align="center"
                    // maxW="xl"
                    >
                        <Heading as='h5' size='18px' color="#1A202C" mb="8px">
                            API Key Plan
                        </Heading>
                        <Text textAlign="center" color="#6C757D" fontSize="sm" mt="8px" fontWeight="400">
                            Choose Your API Key Plan, Unlock seamless integration and advanced features for your chatbot with the right plan for your needs.
                        </Text>

                    </Flex> */}
                    <VStack spacing={2}>
                        <Heading as="h2" size="xl" color="gray.800">
                            Pricing
                        </Heading>
                        <Text fontSize="lg" color="gray.500">
                            Full access to every feature on all plans. Only the number of bots scales.
                        </Text>
                    </VStack>
                    <VStack spacing={6} py={5} textAlign="center">
                        <Box
                            p={1}
                            bg="white"
                            borderRadius="full"
                            border="1px solid"
                            borderColor="gray.100"
                            boxShadow="sm"
                        >
                            <HStack spacing={0}>
                                <Button
                                    size="md"
                                    borderRadius="full"
                                    px={8}
                                    bg={!isYearly ? "#2977FF" : "transparent"}
                                    color={!isYearly ? "white" : "gray.500"}
                                    _hover={{ bg: !isYearly ? "#2977FF" : "gray.50" }}
                                    onClick={() => setIsYearly(false)}
                                    // Custom purple color from the image
                                    backgroundColor={!isYearly ? "#2977FF" : "transparent"}
                                >
                                    Monthly plan
                                </Button>

                                <HStack
                                    as="button"
                                    onClick={() => setIsYearly(true)}
                                    spacing={2}
                                    px={8}
                                    borderRadius="full"
                                    py={2}
                                    bg={isYearly ? "#2977FF" : "transparent"}
                                    transition="all 0.2s"
                                >
                                    <Text
                                        fontWeight="medium"
                                        color={isYearly ? "white" : "gray.500"}
                                    >
                                        Yearly plan
                                    </Text>
                                    <Badge
                                        colorScheme="blue"
                                        variant="solid"
                                        borderRadius="full"
                                        px={2}
                                        py={1}
                                        fontSize="xs"
                                        bg="#2977FF" // Darker purple for the "Save" badge
                                        color="white"
                                        textTransform="none"
                                    >
                                        Save up to 20%
                                    </Badge>
                                </HStack>
                            </HStack>
                        </Box>
                    </VStack>
                </Box>
                <Text as="span">
                    <SimpleGrid columns={[1, 1, 1, 3]} spacing="6" templateColumns={{ lg: "repeat(3, minmax(0, 1fr))", sm: "repeat(1, minmax(0, 1fr))", md: "repeat(2, minmax(0, 1fr))" }}>


                        {plans.map((plan, index) => (
                            <PricingCard key={index} {...plan} />
                        ))}



                        {/* <PricingApiCard
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
                        <PricingApiCard
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
                        <PricingApiCard
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