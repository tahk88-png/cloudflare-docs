import type { WorkersAIModelsSchema } from "~/schemas";

const ModelFeatures = ({ model }: { model: WorkersAIModelsSchema }) => {
	const nf = new Intl.NumberFormat("en-US");
	const currencyFormatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 10,
	});
	type ModelProperty = WorkersAIModelsSchema["properties"][number];
	type PropertyValue = ModelProperty["value"];

	const properties = Object.fromEntries(
		model.properties.map((property: ModelProperty) => [
			property.property_id,
			property.value,
		]),
	) as Record<string, PropertyValue>;

	const plannedDeprecationDate =
		typeof properties.planned_deprecation_date === "string"
			? properties.planned_deprecation_date
			: undefined;

	const contextWindow =
		typeof properties.context_window === "string" ? properties.context_window : undefined;

	const terms = typeof properties.terms === "string" ? properties.terms : undefined;
	const info = typeof properties.info === "string" ? properties.info : undefined;
	const maxInputTokens =
		typeof properties.max_input_tokens === "string"
			? properties.max_input_tokens
			: undefined;
	const outputDimensions =
		typeof properties.output_dimensions === "string"
			? properties.output_dimensions
			: undefined;

	const functionCalling = properties.function_calling === "true";
	const lora = properties.lora === "true";
	const beta = properties.beta === "true";
	const asyncQueue = properties.async_queue === "true";

	const price = Array.isArray(properties.price) ? properties.price : undefined;

	return (
		<>
			{Object.keys(properties).length ? (
				<>
					<table>
						<thead>
							<tr>
								<>
									<th>Model Info</th>
									<th />
								</>
							</tr>
						</thead>
						<tbody>
							{plannedDeprecationDate && (
								<tr>
									<td>
										{Date.now() >
										Math.floor(
											new Date(plannedDeprecationDate).getTime() /
												1000,
										)
											? "Deprecated"
											: "Planned Deprecation"}
									</td>
									<td>
										{new Date(plannedDeprecationDate).toLocaleDateString(
											"en-US",
										)}
									</td>
								</tr>
							)}
							{contextWindow && (
								<tr>
									<td>
										Context Window
										<a href="/workers-ai/glossary/">
											<span className="external-link"> ↗</span>
										</a>
									</td>
									<td>{nf.format(Number(contextWindow))} tokens</td>
								</tr>
							)}
							{terms && (
								<tr>
									<td>Terms and License</td>
									<td>
										<a href={terms} target="_blank">
											link<span className="external-link"> ↗</span>
										</a>
									</td>
								</tr>
							)}
							{info && (
								<tr>
									<td>More information</td>
									<td>
										<a href={info} target="_blank">
											link<span className="external-link"> ↗</span>
										</a>
									</td>
								</tr>
							)}
							{maxInputTokens && (
								<tr>
									<td>Maximum Input Tokens</td>
									<td>{nf.format(Number(maxInputTokens))}</td>
								</tr>
							)}
							{outputDimensions && (
								<tr>
									<td>Output Dimensions</td>
									<td>{nf.format(Number(outputDimensions))}</td>
								</tr>
							)}
							{functionCalling && (
								<tr>
									<td>
										Function calling{" "}
										<a href="/workers-ai/function-calling">
											<span className="external-link"> ↗</span>
										</a>
									</td>
									<td>Yes</td>
								</tr>
							)}
							{lora && (
								<tr>
									<td>LoRA</td>
									<td>Yes</td>
								</tr>
							)}
							{beta && (
								<tr>
									<td>Beta</td>
									<td>Yes</td>
								</tr>
							)}
							{asyncQueue && (
								<tr>
									<td>Batch</td>
									<td>Yes</td>
								</tr>
							)}
							{price && price.length > 0 && (
								<tr>
									<td>Unit Pricing</td>
									<td>
										{price
											.map((p) => {
												if (
													typeof p !== "object" ||
													p === null ||
													!("price" in p) ||
													!("unit" in p)
												) {
													return "";
												}

												const priceValue = Number(
													(p as Record<string, unknown>).price,
												);
												const unit = String((p as Record<string, unknown>).unit);
												return `${currencyFormatter.format(priceValue)} ${unit}`;
											})
											.filter(Boolean)
											.join(", ")}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</>
			) : (
				false
			)}
		</>
	);
};

export default ModelFeatures;
