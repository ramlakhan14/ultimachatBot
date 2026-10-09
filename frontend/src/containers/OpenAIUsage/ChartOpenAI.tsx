import React, { useMemo } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Select,
  HStack,
  Spinner,
} from "@chakra-ui/react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const MONTH_OPTIONS = [
  "Month",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ALL_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const YEARS = ["2023", "2024", "2025", "2026"];

// Dynamic model color mappings & fallbacks
const MODEL_COLOR_MAP: Record<string, string> = {
  "text-embedding-ada-002": "#2563EB",
  "gpt-5-mini": "#F26B80",
  "gpt-4o-mini": "#F97316",
  "gpt-4o": "#8B5CF6",
  "gpt-4": "#10B981",
  "gpt-3.5-turbo": "#06B6D4",
  "dall-e-3": "#EC4899",
  "whisper-1": "#EAB308",
};

const FALLBACK_COLORS = [
  "#2563EB",
  "#F26B80",
  "#F97316",
  "#8B5CF6",
  "#10B981",
  "#06B6D4",
  "#EC4899",
  "#EAB308",
  "#6366F1",
  "#14B8A6",
  "#F43F5E",
  "#3B82F6",
];

const getModelColor = (modelName: string, index: number): string => {
  if (MODEL_COLOR_MAP[modelName]) {
    return MODEL_COLOR_MAP[modelName];
  }
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
};

interface ChartOpenAIProps {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  overviewData: any;
  isLoading: boolean;
}

const ChartOpenAI: React.FC<ChartOpenAIProps> = ({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  overviewData,
  isLoading,
}) => {
  const monthIdx = MONTH_OPTIONS.indexOf(selectedMonth) - 1;
  const shortMonth = monthIdx >= 0 ? ALL_MONTH_NAMES[monthIdx] : "Jul";

  // Dynamically extract all unique model keys present in API or dummy data
  const activeModelKeys = useMemo(() => {
    const keysSet = new Set<string>();

    const modelTotals = overviewData?.modelTotals || {};
    Object.keys(modelTotals).forEach((k) => keysSet.add(k));

    const rawChartList = overviewData?.chartData || [];
    rawChartList.forEach((item: any) => {
      if (item?.models && typeof item.models === "object") {
        Object.keys(item.models).forEach((k) => keysSet.add(k));
      }
    });

    const list = Array.from(keysSet);
    if (list.length === 0) {
      return ["text-embedding-ada-002", "gpt-5-mini", "gpt-4o-mini"];
    }
    return list;
  }, [overviewData]);

  const rawChartList = overviewData?.chartData || [];
  const groupBy = overviewData?.groupBy || (selectedMonth === "Month" ? "month" : "day");

  // Dynamically format chart points for Recharts with dynamic model cost keys
  const formattedChartData = useMemo(() => {
    return rawChartList.map((item: any, idx: number) => {
      const modelsObj = item.models || {};
      const pointData: any = {
        total: item.totalCostUsd || 0,
      };

      let sumCosts = 0;
      activeModelKeys.forEach((key) => {
        const val = modelsObj[key]?.costUsd || 0;
        pointData[key] = val;
        sumCosts += val;
      });

      if (!item.totalCostUsd) {
        pointData.total = sumCosts;
      }

      let displayLabel = item.label || "";
      if (selectedMonth === "Month" || groupBy === "month") {
        const mIndex = item.label ? parseInt(item.label, 10) - 1 : idx;
        displayLabel = ALL_MONTH_NAMES[mIndex] || ALL_MONTH_NAMES[idx] || `M${idx + 1}`;
      } else {
        const dayNum = item.label ? parseInt(item.label, 10) : idx + 1;
        const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
        displayLabel = `${shortMonth} ${formattedDay}`;
      }

      pointData.label = displayLabel;
      return pointData;
    });
  }, [rawChartList, activeModelKeys, selectedMonth, groupBy, shortMonth]);

  const totalSpend = overviewData?.totalSpend || 0;
  const todaySpend = overviewData?.todaySpend || 0;

  const modelTotals = overviewData?.modelTotals || {};

  const formatMoney = (val: number) => {
    if (val === 0) return "0.00";
    if (val >= 0.01) return val.toFixed(2);
    if (val >= 0.0001) return val.toFixed(4);
    return val.toFixed(5);
  };

  // Custom Tooltip Component rendering all dynamic models for hovered data point
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <Box
          bg="white"
          p={3}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="lg"
          fontSize="13px"
        >
          <Text fontWeight="bold" color="gray.700" mb={2}>
            {dataPoint.label}, {selectedYear}
          </Text>
          {activeModelKeys.map((key, idx) => {
            const val = dataPoint[key] || 0;
            return (
              <Flex key={key} align="center" mb={1} justify="space-between" gap={4}>
                <HStack spacing={2}>
                  <Box w="10px" h="10px" bg={getModelColor(key, idx)} borderRadius="2px" />
                  <Text color="gray.600">{key}:</Text>
                </HStack>
                <Text fontWeight="600" color="gray.800">
                  ${formatMoney(val)}
                </Text>
              </Flex>
            );
          })}
          <Box borderTop="1px solid" borderColor="gray.100" pt={2} mt={2}>
            <Flex justify="space-between" fontWeight="bold">
              <Text color="gray.700">Total Spend:</Text>
              <Text color="gray.900">${formatMoney(dataPoint.total)}</Text>
            </Flex>
          </Box>
        </Box>
      );
    }
    return null;
  };

  const renderCustomXAxisTick = (props: any): any => {
    const { x, y, payload, index } = props;

    if (selectedMonth === "Month" || groupBy === "month") {
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={16}
            dy={0}
            textAnchor="middle"
            fill="#475569"
            fontSize="12px"
            fontWeight="500"
          >
            {payload.value}
          </text>
        </g>
      );
    }

    const isFirst = index === 0;
    const isLast = index === formattedChartData.length - 1;

    if (!isFirst && !isLast) {
      return <g />;
    }

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={16}
          dy={0}
          textAnchor={isFirst ? "start" : "end"}
          fill="#475569"
          fontSize="12px"
          fontWeight="500"
        >
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="xl"
      p={{ base: 4, md: 6 }}
      shadow="sm"
      w="100%"
      mb={6}
      position="relative"
    >
      {/* Header with Title and Month/Year Dropdowns */}
      <Flex
        justify="space-between"
        align="center"
        mb={4}
        wrap="wrap"
        gap={3}
      >
        <Heading fontSize="18px" fontWeight="700" color="#1A202C">
          Usage Overview
        </Heading>

        <HStack spacing={3}>
          <Select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            w="110px"
            h="36px"
            borderRadius="md"
            borderColor="gray.300"
            fontSize="14px"
            fontWeight="500"
            color="gray.700"
            cursor="pointer"
            focusBorderColor="blue.500"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>

          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            w="90px"
            h="36px"
            borderRadius="md"
            borderColor="gray.300"
            fontSize="14px"
            fontWeight="500"
            color="gray.700"
            cursor="pointer"
            focusBorderColor="blue.500"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </HStack>
      </Flex>

      {/* Spend Metric Section */}
      <Box mb={2}>
        <Text fontSize="13px" fontWeight="500" color="#64748B" mb={1}>
          Total Spend
        </Text>
        <Text fontSize="28px" fontWeight="800" color="#0F172A" lineHeight="1.2">
          ${formatMoney(totalSpend)}
        </Text>
        <Text fontSize="13px" color="#94A3B8" mt={1}>
          ${formatMoney(todaySpend)} from today
        </Text>
      </Box>

      {/* Dotted separator line */}
      <Box borderBottom="1px dashed #E2E8F0" my={5} />

      {/* Chart Section */}
      <Box w="100%" h="290px" position="relative">
        {/* Non-bumping loading overlay */}
        {isLoading && (
          <Flex
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="rgba(255, 255, 255, 0.75)"
            backdropFilter="blur(1px)"
            zIndex={10}
            justify="center"
            align="center"
            borderRadius="md"
          >
            <Spinner color="blue.500" size="lg" thickness="3px" />
          </Flex>
        )}

        {formattedChartData.length === 0 && !isLoading ? (
          <Flex h="100%" justify="center" align="center">
            <Text color="gray.500" fontSize="14px">No chart data available</Text>
          </Flex>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formattedChartData}
              margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
              barCategoryGap={selectedMonth === "Month" ? "20%" : "12%"}
            >
              <CartesianGrid
                vertical={false}
                stroke="#F1F5F9"
                strokeDasharray="0 0"
              />
              <XAxis
                dataKey="label"
                axisLine={{ stroke: "#EF4444", strokeWidth: 1.5 }}
                tickLine={false}
                tick={renderCustomXAxisTick}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94A3B8", fontSize: 12 }}
                domain={[0, "auto"]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(226, 232, 240, 0.3)" }} />

              {/* Dynamically render stacked Bars for every active model */}
              {activeModelKeys.map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={getModelColor(key, idx)}
                  maxBarSize={30}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>

      {/* Dynamic Legend at Bottom rendering all active models */}
      <Flex
        justify="center"
        align="center"
        wrap="wrap"
        gap={{ base: 3, md: 6 }}
        mt={5}
        pt={1}
      >
        {activeModelKeys.map((key, idx) => {
          const mTotalCost = modelTotals[key]?.costUsd || 0;
          return (
            <HStack key={key} spacing={2}>
              <Box w="14px" h="14px" bg={getModelColor(key, idx)} borderRadius="2px" />
              <Text fontSize="13px" color="#334155" fontWeight="500">
                {key}{" "}
                <Text as="span" color="#64748B">
                  (${formatMoney(mTotalCost)})
                </Text>
              </Text>
            </HStack>
          );
        })}
      </Flex>
    </Box>
  );
};

export default ChartOpenAI;