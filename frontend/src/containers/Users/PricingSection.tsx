import {
  Box,
  Button,
  Flex,
  Text,
  Badge,
  Input,
  List,
  ListItem,
  ListIcon,
  SimpleGrid,
  useToast,
  HStack,
  Icon,
  Heading,
  Divider,
} from "@chakra-ui/react";
import { CheckCircle, CheckCircleIcon, Lightning, MoneyIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { FaCrown, FaGem, FaRocket } from "react-icons/fa";

type Plan = {
  id: string;
  title: string;
  price: number;
  bonus?: string;
  icon?: any,
  credits: string[];
};

const plans: Plan[] = [
  {
    id: "starter",
    title: "Starter",
    price: 200,
    icon: FaRocket,
    credits: [
      "20,000 Credits",
      "20,000 Total Credits",
      "$0.01 per credit",
    ],
  },
  {
    id: "pro",
    title: "Pro",
    price: 500,
    icon: FaCrown,
    bonus: "5% Bonus",
    credits: [
      "50,000 Credits",
      "52,500 Total Credits",
      "$0.0095 per credit",
    ],
  },
  {
    id: "ultimate",
    title: "Ultimate",
    price: 1000,
    bonus: "10% Bonus",
    icon: FaGem,
    credits: [
      "100,000 Credits",
      "110,000 Total Credits",
      "$0.0091 per credit",
    ],
  },
];

type ActionPayload = {
  amount: string;
  plan: string;
};
interface Props {
  handleAction: (data: ActionPayload) => Promise<void>;
  isAddLoading: string | null;
}
const PricingSection: React.FC<Props> = ({ handleAction, isAddLoading }) => {
  const [customAmount, setCustomAmount] = useState<number | "">("");
  const purpleColor = "#2977FF"
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleAddPlan = (plan: Plan): void => {
    const payload: ActionPayload = {
      amount: plan?.price?.toString() || "0",
      plan: plan?.title?.toUpperCase() || ""
    }
    handleAction?.(payload)
  };

  const handleCustomAdd = (): void => {
    if (customAmount) {
      handleAction?.({
        amount: customAmount.toString() || "0",
        plan: "CUSTOM" || ""
      })
    } else {
      setIsSubmitted(true);
    }
    // console.log("Custom amount added:", customAmount);
  };

  return (
    <Box>
      <Box
        textAlign="center"
        py={6}
      >
        <Text
          fontSize="24px"
          fontWeight="700"
          color="#1A202C"
        >
          Add on credits plan
        </Text>

        <Text
          fontSize="sm"
          color="gray.500"
          mt={1}
        >
          All services now run on a unified credit system:{" "}
          1 credit = $0.01 (1 dollar = 100 credits)
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6}>
        {plans.map((plan: any) => (
          <Box
            key={plan.id}
            borderWidth="1px"
            borderRadius="12px"
            p={"20px"}
            border="1px solid #E2E8F0"
            bg={"#FFFFFF"}
            boxShadow="sm"
          // minWidth={"200px"}
          >
            <Box>

              <Flex justify="space-between"
                align="center"
                mb={2}
                flexWrap="wrap" // Allows items to drop to next line if space is tight
                rowGap={2}>
                <HStack>
                  <Icon as={plan?.icon || ""}
                    color={plan?.title == "Starter" ? "#7C2FF1" : plan?.title == "Pro" ? "#0088FF" : plan?.title == "Ultimate" ? "#524D4D" : purpleColor}
                    boxSize={5} />
                  <Heading fontSize={"22px"} fontWeight={"700"} color="#524D4D">{plan?.title}</Heading>
                </HStack>
                {plan.bonus && (
                  <Badge
                    variant="outline"
                    color={"#2977FF"}
                    border={"1px solid #2977FF"}
                    background={"rgb(227, 243, 255)"}
                    borderRadius="full"
                    px={3}
                    py={1}
                    textTransform="none"
                    display={"flex"}
                    alignItems={"center"}
                    gap={"1px"}
                  >
                    <Icon
                      as={Lightning}
                      size={24} weight="fill" color="#1E5BFF"
                    />
                    {plan.bonus}
                  </Badge>
                )}
              </Flex>
            </Box>

            <Text
              fontSize="48px"
              fontWeight="500"
              color="#524D4D"
            // textDecoration="line-through"
            >
              ${plan.price}
            </Text>

            <Divider mb={"16px"} color={"#8080804D"} />

            <List spacing={"16px"} >
              {plan.credits.map((item: any, index: any) => (
                <ListItem fontSize={"16px"} key={index}>
                  <Flex alignItems={"center"} gap={"20px"}>
                    <ListIcon fontSize={"24px"} margin={"0"} as={CheckCircleIcon} color={"#2977ff"} />
                    <Text color={"#524D4D"} fontWeight={"400"}>
                      {item.split(/(\$?\d[\d,\.]*)/).map((part: any, i: any) =>
                        /(\$?\d[\d,\.]*)/.test(part) ? (
                          <Text as="span" fontWeight="600" key={i}>
                            {part}
                          </Text>
                        ) : (
                          part
                        )
                      )}
                    </Text>

                  </Flex>
                </ListItem>
              ))}
            </List>

            <Button
              w="full"
              mt={"40px"}
              isLoading={!!(isAddLoading == plan?.title?.toUpperCase())}
              colorScheme="blue"
              className="btn-hover-pri"
              onClick={() => handleAddPlan(plan)}
              fontWeight={500}
            >
              Add
            </Button>
          </Box>
        ))
        }

        {/* Custom Amount Card */}
        <Box borderWidth="1px" borderRadius="lg" p={6} bg="white">
          <HStack mb={3}>
            <Icon as={MoneyIcon || ""}
              color={"green"}
              boxSize={5} />
            <Heading fontSize={"22px"} fontWeight={"700"} color="#524D4D"> Add Custom</Heading>

          </HStack>

          <Text mb="16px" color={"#6C757D"} fontSize={"16px"} lineHeight={"24px"} letterSpacing={"0"} fontWeight={"400"} >Enter your own amount</Text>

          <Input
            type="number"
            placeholder=" $ 00"
            // mb={6}
            min={1}
            value={customAmount}
            onChange={(e) =>
              setCustomAmount(
                e.target.value === ""
                  ? ""
                  : Number(e.target.value)
              )
            }
          />
          {isSubmitted && (!customAmount || customAmount <= 0) && (
            <Text color="red.500" fontSize="sm" mt="5px">
              Please enter a valid amount
            </Text>
          )}

          <Divider mt={"16px"} color={"#8080804D"} />
          <Button
            mt="130px"
            w="full"
            isLoading={!!(isAddLoading == "CUSTOM")}

            colorScheme="blue"
            className="btn-hover-pri"
            onClick={handleCustomAdd}
          >
            Add Money
          </Button>
        </Box>
      </SimpleGrid >
    </Box >
  );
};

export default PricingSection;
