import * as React from "react";
import {
  Box,
  Button,
  Flex,
  HStack, Spinner,
  VStack,
  Heading,
  Text,
  useToast
} from "@chakra-ui/react";
import { RouteComponentProps, withRouter, useParams, useLocation } from "react-router-dom";
import styles from "./Trail.module.scss";
import { Logo } from "../../components/Logo/Logo";
import { SignLogo } from "./SignLogo";
import BgImg from "./bgSingup.png";
import { getDomainFromUrl } from "../../utils/commonUtils";
import {
  createVisitorKnowledgebase,
  fetchKnowledgebaseVisitorsCrawlData,
  fetchKnowledgebaseVisitorsDetails,
  generateEmbeddingsVisitors,
  fetchKnowledgebaseCrawlDataVisitorsForDocs,
  addTrainingDoc
} from "../../services/knowledgebaseService";
import {
  DocsKnowledgeData
} from "../../types/knowledgebase.type";
import { ChatBot } from "../../components/ChatBot/ChatApp";
import TrainedOn from "./TrainedOn";
import { FiSend } from "react-icons/fi";

interface LoginProps extends RouteComponentProps {
  onLoginIn: (token: string, redirectTo?: string) => void;
}

const Tail = (props: LoginProps) => {
  const [knowledgeBaseId, setKnowledgeBaseId] = React.useState<string>("");
  const [isUploadingDocs, setIsUploadingDocs] = React.useState<boolean>(false);
  const toast = useToast();
  const [docsDataLoading, setDocsDataLoading] = React.useState<boolean>(false);
  const [docsData, setDocsData] = React.useState<any>();
  const [productSetupLoadingText, setProductSetupLoadingText] = React.useState(
    "Crawling your website data.. "
  );
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [defaultCrauledData, setDefaultCrauledData] = React.useState<any>();
  const [defaultPayloadData, setdefaultPayloadData] = React.useState<any>();
  const [chatBot, setChatbot] = React.useState({} as any);

  interface FormValues {
    websiteUrl: string;
    target?: string[];
    exclude?: string[];
    files: File[];
  }

  interface WebsiteData {
    name: string;
    websiteUrl: string;
    urls: string[];
    include: string[];
    exclude: string[];
  }

  interface ProductSetupData {
    websiteData: WebsiteData;
    files: File[];
  }



  const handleClick = async (websiteUrl: string) => {
    // Assume empty arrays for target, exclude, and files if not provided
    const formValues: FormValues = {
      websiteUrl: websiteUrl,
      target: [],
      exclude: [],
      files: [],
    };

    // Process target paths
    let targetPaths: string[] = [];
    if (formValues.target) {
      targetPaths = formValues.target.map((path) => path.trim());
    }

    // Process exclude paths
    let excludePaths: string[] = [];
    if (formValues.exclude) {
      excludePaths = formValues.exclude.map((path) => path.trim());
    }

    // Determine chatbot name
    let chatbotName = "";
    if (formValues.websiteUrl) {
      chatbotName = getDomainFromUrl(formValues.websiteUrl);
    } else if (formValues.files.length > 0) {
      chatbotName = formValues.files[0].name;
    }

    const websiteData: WebsiteData = {
      name: chatbotName,
      websiteUrl: formValues.websiteUrl,
      urls: [],
      include: targetPaths,
      exclude: excludePaths,
    };

    const payLoad: ProductSetupData = {
      websiteData: websiteData,
      files: formValues.files,
    };
    // chatWidgetDefaultValues.welcomeMessage = `${payLoad.websiteData.name}`;
    setChatbot(`${payLoad.websiteData.name}`);
    const response = await createVisitorKnowledgebase(payLoad.websiteData);
    setKnowledgeBaseId(response.data._id);
    let _docsData: DocsKnowledgeData;
    if (payLoad.files?.length && payLoad.files.length > 0) {
      setIsUploadingDocs(true);
      for (const file of payLoad.files) {
        try {
          await addTrainingDoc(response.data._id, file);
        } catch (error: any) {
        }
      }
      setIsUploadingDocs(false);
      setDocsDataLoading(true);
      const _docsDataResponse = await fetchKnowledgebaseCrawlDataVisitorsForDocs(
        response.data._id,
        1
      );
      _docsData = {
        docs: _docsDataResponse.data.results,
        pages: _docsDataResponse.data.pages,
        knowledgebaseId: response.data._id,
      };
      setDocsData(_docsData);
      setDocsDataLoading(false);
    }
    let interval = setInterval(async () => {

      const details = await fetchKnowledgebaseVisitorsDetails(response.data._id);
      if (details.data.websiteData !== null) {


        setProductSetupLoadingText(
          "Crawling your website data.. This may take some time depending on the size of the data."
        );
      }
      const chatBotId = details.data._id;
      if (
        details.data.status === "CRAWLED" ||
        (details.data.status === "CREATED" &&
          _docsData &&
          _docsData.docs.length > 0)
      ) {

        setProductSetupLoadingText(
          "Training with your data... This may take some time based on the amount of the data..."
        );
        await generateEmbeddingsVisitors(chatBotId);
      } else if (
        details.data.status === "CRAWL_ERROR" ||
        details.data.status === "EMBEDDING_ERROR" ||
        (details.data.websiteData === null &&
          (_docsData === undefined || _docsData.docs.length === 0))
      ) {
        clearInterval(interval);
        setIsSubmitting(false);
        toast({
          title: `Oops! Something went wrong`,
          status: "error",
          isClosable: true,
        });
      } else if (details.data.status === "GENERATING_EMBEDDINGS") {


        setProductSetupLoadingText(
          "Training  with your data... This may take some time based on the amount of the data..."
        );
      } else if (details.data.status === "READY") {
        clearInterval(interval);
        const _crawlDataResponse = await fetchKnowledgebaseVisitorsCrawlData(
          chatBotId,
          1
        );

        const _data = {
          stats: details.data.crawlData?.stats,
          urls: _crawlDataResponse.data.results,
          pages: _crawlDataResponse.data.pages,
          knowledgebaseId: details.data._id,
        };
        setDefaultCrauledData(_data);
        setIsSubmitting(false);
        toast({
          title: `Your bot created Successfully`,
          status: "success",
          isClosable: true,
        });
      }
    }, 2000);
  };
  const useQuery = () => {
    return new URLSearchParams(useLocation().search);
  };

  const query = useQuery();
  const url: any = query.get('url');
  React.useEffect(() => {

    handleClick(url);
  }, []);


  return (
    <VStack spacing="0" w="100%" h="100vh">
      <Flex
        shrink={0}
        shadow="base"
        w="100%"
        h="60px"
        bg="white"
        justifyContent="space-between"
        pr="10"
        pb="4"
        pt="4"
        pl="10"
        zIndex="2"
        alignItems="center"
      >
        <Logo></Logo>
        <Box>
          <Text as="span" bg="#DC3545" color="#fff" padding="6px 12px" borderRadius="4px" fontSize="16px" fontWeight="400">TRIAL RUN</Text>

        </Box>
      </Flex>
      <Flex flex={1} h="calc(100% - 100px)" w="100%">
        <HStack spacing="0" w="100%" justify="start">
          <Flex
            h="100%"
            w="270px"
            shadow="base"
            bg="white"
            flexShrink={0}
            p="5"
            direction="column"
            justifyContent="space-between"
            pt="10"
          >
            <div
              style={{
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-end",
              }}
            >
              <VStack
                w="100%"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box>
                  <Heading
                    as="h6"
                    size="sm"
                    sx={{
                      fontSize: "14px",
                      color: "#1A202C",
                      fontWeight: "600",
                      marginBottom: "10px",
                    }}
                  >
                    SIGN UP
                  </Heading>
                  <Text
                    color="#2977FF"
                    size="sm"
                    sx={{
                      fontSize: "20px",
                      fontWeight: "700",
                      marginBottom: "10px",
                    }}
                  >
                    Let’s implement this bot on your website.
                  </Text>
                  <Text
                    color="#6C757D"
                    size="sm"
                    sx={{ fontSize: "16px", fontWeight: "400" }}
                  >
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut
                    et massa mi. Aliquam in hendrerit urna.
                  </Text>
                </Box>
                <Box
                  sx={{
                    position: "relative",
                    backgroundImage: `url(${BgImg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    padding: "20px",
                    borderRadius: "10px",
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      backgroundColor: "rgba(255, 255, 255, 0.8)", // White overlay with 50% opacity
                      zIndex: 1,
                      borderRadius: "inherit", // Match the border radius
                    },
                    "& > *": {
                      position: "relative",
                      zIndex: 2,
                    },
                  }}
                >
                  <SignLogo />
                  <Text
                    color="#0D0D0D"
                    size="sm"
                    sx={{
                      fontSize: "18px",
                      fontWeight: "700",
                      margin: "15px 0px",
                    }}
                  >
                    Scale your support, without scaling costs.
                  </Text>

                  <Button
                    color={"#fff"}
                    backgroundColor={"#0D0D0D"}
                    size="sm"
                    width="100%"
                    fontWeight="400"
                    fontSize="14px"
                    className={styles.signUp}
                    onClick={() => window.location.href = "/signup"}
                  >
                    <span
                      style={{ marginRight: "10px" }}
                      className={styles.signUp}
                    >
                      <FiSend />
                    </span>
                    Sign Up
                  </Button>

                </Box>
              </VStack>
            </div>
          </Flex>

          <Flex direction="column" h="100%" overflow="auto" w="100%" p="6">
            {defaultCrauledData === undefined ? <VStack
              alignItems="center"
              justifyContent="center"
              position="fixed"
              top="0"
              left="0"
              width="100vw"
              height="100vh"
              bg="rgba(255, 255, 255, 0.8)" // Optional: background color with opacity
              zIndex="9999" // Ensures the loader is on top of other elements
            >
              <Flex
                direction="column"
                justifyContent="center"
                alignItems="center"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
                p="12"
                bg="white" // Background color for the loader container
              >
                <Spinner color="gray.700" mb="4" />
                <Text color="gray.500">
                  {productSetupLoadingText}
                </Text>
              </Flex>
            </VStack> : null}
            <Heading fontSize="30" mb="8">
              Congratulations! Your AI assistant is ready ✨
            </Heading>
            <HStack w="100%">
              <Box w="60%" h="100%">

                {defaultCrauledData === undefined ? null : (
                  <ChatBot
                    knowledgeBaseId={defaultCrauledData.knowledgebaseId}
                    customStyle={chatBot}
                    defaultMessageNumber={0}

                  />
                )}

              </Box>
              <Box w="40%" pos="relative" h="100%" style={{ backgroundColor: "#fff" }}>
                <Flex direction="column" h="100%" >
                  {defaultCrauledData === undefined ? null :
                    <TrainedOn items={defaultCrauledData} />
                  }

                </Flex>
              </Box>
            </HStack>
          </Flex>
        </HStack>
      </Flex>
    </VStack>
  );
};

export default withRouter(Tail);
